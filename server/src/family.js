// Family Space: create/join by invite code, membership listing, code rotation.
// One family per user in v1 — callers are expected to check getFamilyForUser
// before offering "create" or "join" again.
import crypto from 'node:crypto';
import { pool, query } from './db.js';
import { broadcastToFamily } from './ws.js';

// Unambiguous alphabet for invite codes: A-Z minus I/O (look like 1/0), plus 2-9.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function randomCode(length = 6) {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function memberRows(familyId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.username, fm.role
     FROM family_members fm JOIN users u ON u.id = fm.user_id
     WHERE fm.family_id = $1
     ORDER BY fm.role = 'owner' DESC, fm.joined_at ASC`,
    [familyId],
  );
  return rows;
}

/**
 * Create a new family, making `userId` its owner. Retries on invite-code
 * collision (extremely unlikely with a 6-char space, but cheap to guard).
 */
export async function createFamily({ name, userId }) {
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');

  const familyId = crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inviteCode;
    for (let attempt = 0; attempt < 8; attempt++) {
      inviteCode = randomCode();
      const { rowCount } = await client.query('SELECT 1 FROM families WHERE invite_code = $1', [inviteCode]);
      if (!rowCount) break;
      inviteCode = undefined;
    }
    if (!inviteCode) throw new Error('could not allocate a unique invite code');

    await client.query(
      'INSERT INTO families (id, name, invite_code, created_by, e2ee) VALUES ($1, $2, $3, $4, true)',
      [familyId, name.trim(), inviteCode, userId],
    );
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [familyId, userId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getFamilyForUser(userId);
}

/** Join a family by invite code. Idempotent if the user is already a member. */
export async function joinFamily({ code, userId }) {
  if (typeof code !== 'string' || !code.trim()) throw badRequest('invite code is required');

  const { rows } = await query('SELECT id FROM families WHERE invite_code = $1', [code.trim().toUpperCase()]);
  const family = rows[0];
  if (!family) throw notFound('no family with that invite code');

  const { rowCount } = await query(
    `INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, 'member')
     ON CONFLICT (family_id, user_id) DO NOTHING`,
    [family.id, userId],
  );

  // A fresh join (not a no-op re-join by an existing member) changes the
  // roster every other member's client is holding — broadcast the full,
  // current member list so it updates live (join screen, Finance split
  // pickers, group-settings "add member" chips, nameOf() fallbacks, and —
  // the case that actually motivated this — E2EE's "who can read this now"
  // visibility) instead of only refreshing on the joiner's own device.
  if (rowCount > 0) {
    const members = await memberRows(family.id);
    await broadcastToFamily(family.id, { type: 'family', action: 'members', familyId: family.id, members });
  }

  return getFamilyForUser(userId);
}

/**
 * The family a user belongs to (v1: at most one), with its member list, or
 * null if the user hasn't joined/created one yet.
 */
export async function getFamilyForUser(userId) {
  const { rows } = await query(
    `SELECT f.id, f.name, f.invite_code, f.e2ee, fm.role
     FROM family_members fm JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = $1
     ORDER BY fm.joined_at ASC
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;

  const members = await memberRows(row.id);
  return {
    family: { id: row.id, name: row.name, inviteCode: row.invite_code, role: row.role, e2ee: row.e2ee },
    members,
  };
}

/** Rotate a family's invite code. Owner-only. */
export async function regenerateCode({ familyId, userId }) {
  const { rows } = await query(
    'SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2',
    [familyId, userId],
  );
  if (!rows[0]) throw notFound('not a member of this family');
  if (rows[0].role !== 'owner') throw forbidden('only the family owner can regenerate the invite code');

  let inviteCode;
  for (let attempt = 0; attempt < 8; attempt++) {
    inviteCode = randomCode();
    const { rowCount } = await query('SELECT 1 FROM families WHERE invite_code = $1', [inviteCode]);
    if (!rowCount) break;
    inviteCode = undefined;
  }
  if (!inviteCode) throw new Error('could not allocate a unique invite code');

  await query('UPDATE families SET invite_code = $1 WHERE id = $2', [inviteCode, familyId]);
  return getFamilyForUser(userId);
}
