// Shared family Notes (Phase P) — end-to-end encrypted, same CRUD+realtime
// pattern as lists.js/events.js: every function is membership-checked — the
// caller (actor) must be a member of the family that owns the row, or a
// fresh 404 for an unknown id / 403 for someone else's family's row.
//
// E2EE: a note's title+body are encrypted together into ONE e2e:1: envelope
// client-side (`{note:{title,body}}` — see app/src/crypto/e2ee.ts) and ride
// here as an opaque `cipher` string. The server never decrypts it — it only
// checks the envelope prefix on write (isEnvelope, same shape-check as
// chat.js's createMessage and family.js's addKeyRoll), which guarantees it
// can never end up storing plaintext.
//
// Read-vs-write asymmetry, same as lists.js/events.js: listNotes degrades to
// an empty array for a family-less user; addNote (which needs somewhere to
// attach the new row) throws 409 'not in a family' instead.
import { query } from './db.js';
import { broadcastToFamily } from './ws.js';
import { getActiveFamilyId } from './requestContext.js';

// Keep in sync with app/src/crypto/e2ee.ts's ENVELOPE_PREFIX (also duplicated
// in chat.js and family.js — this codebase's convention is a tiny per-module
// copy rather than a shared import).
const ENVELOPE_PREFIX = 'e2e:1:';
function isEnvelope(body) {
  return typeof body === 'string' && body.startsWith(ENVELOPE_PREFIX);
}

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

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

// Phase S — see lists.js's copy of this helper for the request-context rationale.
async function userFamilyId(userId) {
  const active = getActiveFamilyId();
  if (active) return active;
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

function mapNote(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    cipher: row.cipher,
    createdBy: row.created_by,
    updatedAt: row.updated_at.toISOString(),
    ts: row.ts.toISOString(),
  };
}

async function assertNoteAccess(id, userId) {
  const { rows } = await query('SELECT * FROM notes WHERE id = $1', [id]);
  const note = rows[0];
  if (!note) throw notFound('note not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || note.family_id !== familyId) throw forbidden('not a member of this family');
  return note;
}

export async function listNotes(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];
  const { rows } = await query('SELECT * FROM notes WHERE family_id = $1 ORDER BY ts ASC', [familyId]);
  return rows.map(mapNote);
}

/** Insert a note (idempotent on `id`). Broadcasts `note`/`upsert` on a fresh insert. */
export async function addNote({ id, cipher, userId }) {
  if (!id) throw badRequest('id is required');
  if (!isEnvelope(cipher)) throw badRequest('cipher must be an e2ee envelope');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  const { rows } = await query(
    `INSERT INTO notes (id, family_id, cipher, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, cipher, userId],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM notes WHERE id = $1', [id]);
    return existing[0] ? mapNote(existing[0]) : null;
  }

  const note = mapNote(rows[0]);
  await broadcastToFamily(familyId, { type: 'note', action: 'upsert', note });
  return note;
}

/** Replaces the note's cipher and bumps updated_at. */
export async function updateNote({ id, cipher, userId }) {
  const note = await assertNoteAccess(id, userId);
  if (!isEnvelope(cipher)) throw badRequest('cipher must be an e2ee envelope');

  const { rows } = await query(
    'UPDATE notes SET cipher = $2, updated_at = now() WHERE id = $1 RETURNING *',
    [id, cipher],
  );

  const updated = mapNote(rows[0]);
  await broadcastToFamily(note.family_id, { type: 'note', action: 'upsert', note: updated });
  return updated;
}

export async function removeNote({ id, userId }) {
  const note = await assertNoteAccess(id, userId);
  await query('DELETE FROM notes WHERE id = $1', [id]);
  await broadcastToFamily(note.family_id, { type: 'note', action: 'remove', ids: [id] });
  return { id };
}
