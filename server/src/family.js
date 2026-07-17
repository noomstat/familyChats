// Family Space: create/join by invite code, membership listing, code rotation.
// Phase S — a user may belong to multiple families; listFamiliesForUser
// returns all of them, and the "active" one for any given request is
// resolved by server.js's resolveFamily middleware (see requestContext.js).
// getFamilyForUser is kept for callers that only care about a single
// (first-joined) family — e.g. as a DB fallback when there's no request
// context at all.
import crypto from 'node:crypto';
import { pool, query } from './db.js';
import { broadcastToUsers, broadcastToFamily } from './ws.js';

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

// Phase Y — LEFT JOINs user_keys so every member carries their currently
// published X25519 public key (null if they've never published one) —
// what the client's auto-grant sweep (grantKeysToKeylessMembers) wraps the
// family anchor key to. Flows through every caller of memberRows
// (getFamilyByIdForUser/listFamiliesForUser/joinFamily's `members` broadcast/
// addMemberFromFriend/leaveFamily), same as every other member field here.
async function memberRows(familyId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.username, fm.role, uk.public_key
     FROM family_members fm
     JOIN users u ON u.id = fm.user_id
     LEFT JOIN user_keys uk ON uk.user_id = u.id
     WHERE fm.family_id = $1
     ORDER BY fm.role = 'owner' DESC, fm.joined_at ASC`,
    [familyId],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, username: r.username, role: r.role, publicKey: r.public_key ?? null }));
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

  return getFamilyByIdForUser(familyId, userId);
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

  return getFamilyByIdForUser(family.id, userId);
}

/**
 * A user's first-joined family (by joined_at), with its member list, or null
 * if they haven't joined/created one yet. Kept for single-family callers and
 * as a DB fallback when there's no request context to resolve an "active"
 * family from (see requestContext.js). For a specific family, prefer
 * getFamilyByIdForUser; for all of a user's families, use listFamiliesForUser.
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

/** A specific family (by id), shaped like getFamilyForUser's result — but only if `userId` is a member of it. Returns null otherwise (unknown id or not a member, indistinguishable to the caller). */
export async function getFamilyByIdForUser(familyId, userId) {
  const { rows } = await query(
    `SELECT f.id, f.name, f.invite_code, f.e2ee, fm.role
     FROM family_members fm JOIN families f ON f.id = fm.family_id
     WHERE fm.family_id = $1 AND fm.user_id = $2`,
    [familyId, userId],
  );
  const row = rows[0];
  if (!row) return null;

  const members = await memberRows(row.id);
  return {
    family: { id: row.id, name: row.name, inviteCode: row.invite_code, role: row.role, e2ee: row.e2ee },
    members,
  };
}

/**
 * Every family `userId` belongs to (Phase S — a user may have several),
 * oldest membership first, each shaped exactly like getFamilyForUser's
 * result (`{ family, members }`). Empty array if the user has none.
 */
export async function listFamiliesForUser(userId) {
  const { rows } = await query(
    `SELECT f.id, f.name, f.invite_code, f.e2ee, fm.role
     FROM family_members fm JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = $1
     ORDER BY fm.joined_at ASC`,
    [userId],
  );

  const out = [];
  for (const row of rows) {
    const members = await memberRows(row.id);
    out.push({
      family: { id: row.id, name: row.name, inviteCode: row.invite_code, role: row.role, e2ee: row.e2ee },
      members,
    });
  }
  return out;
}

// Phase N — E2EE envelope prefix, kept in sync with chat.js's own copy (and
// app/src/crypto/e2ee.ts's ENVELOPE_PREFIX). A key roll's `wrapped` blob is
// shaped exactly like an encrypted message body — the server only checks the
// prefix, never the contents.
const ENVELOPE_PREFIX = 'e2e:1:';
function isEnvelope(body) {
  return typeof body === 'string' && body.startsWith(ENVELOPE_PREFIX);
}

/**
 * Record a key roll: `wrapped` is the new family key, encrypted client-side
 * under the previous active key. Any member may rotate (the UI restricts the
 * button to owners, but there's no server-side reason to — everyone already
 * holds the whole key history). Broadcasts so other members' clients can
 * fixpoint-replay it into their local keyring immediately.
 */
export async function addKeyRoll({ familyId, userId, wrapped }) {
  const { rows } = await query(
    'SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2',
    [familyId, userId],
  );
  if (!rows.length) throw forbidden('not a member of this family');
  if (!isEnvelope(wrapped)) throw badRequest('wrapped must be an e2ee envelope');

  const id = crypto.randomUUID();
  const { rows: inserted } = await query(
    `INSERT INTO family_key_rolls (id, family_id, wrapped, created_by)
     VALUES ($1, $2, $3, $4) RETURNING id, family_id, wrapped, created_by, created_at`,
    [id, familyId, wrapped, userId],
  );
  const row = inserted[0];
  const roll = { id: row.id, familyId: row.family_id, wrapped: row.wrapped, createdBy: row.created_by, createdAt: row.created_at.toISOString() };
  await broadcastToFamily(familyId, { type: 'family', action: 'keyroll', familyId, roll });
  return roll;
}

/** Every key roll for a family, oldest first — the order a fixpoint replay should apply them in (though the replay itself is order-independent). */
export async function listKeyRolls(familyId) {
  const { rows } = await query(
    'SELECT id, family_id, wrapped, created_by, created_at FROM family_key_rolls WHERE family_id = $1 ORDER BY created_at ASC',
    [familyId],
  );
  return rows.map((row) => ({ id: row.id, familyId: row.family_id, wrapped: row.wrapped, createdBy: row.created_by, createdAt: row.created_at.toISOString() }));
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

// ── Phase X — membership: add-from-friends, leave, member keys ──

/**
 * Add-from-friends is instant (no accept step — the two users are already
 * mutual friends). The ADDER's device wraps the family's anchor key
 * (ring[0]) to the friend's X25519 public key client-side BEFORE calling
 * this — `wrapped` is that opaque e2e:1: envelope (see e2ee.ts's wrapKey);
 * the server only ever checks its shape, never a raw key. `actorId` must
 * already be a member of `familyId` (any member may add, not just the
 * owner — see the plan's confirmed scope) and `friendId` must be `actorId`'s
 * friend (friendships is directed — see friends.js's connectByQr, which
 * always inserts both directions, so this check is symmetric in practice).
 * Also adds `friendId` to every existing group in the family so they see the
 * family's chats immediately, same as joining by invite code would.
 * Idempotent: re-adding an existing member just refreshes their wrapped key
 * (ON CONFLICT DO UPDATE) rather than erroring.
 */
export async function addMemberFromFriend({ familyId, actorId, friendId, wrapped }) {
  if (!friendId) throw badRequest('friendId is required');
  if (friendId === actorId) throw badRequest("can't add yourself");
  if (!isEnvelope(wrapped)) throw badRequest('wrapped must be an e2ee envelope');

  const { rowCount: actorIsMember } = await query(
    'SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2',
    [familyId, actorId],
  );
  if (!actorIsMember) throw forbidden('not a member of this family');

  const { rowCount: areFriends } = await query(
    'SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2',
    [actorId, friendId],
  );
  if (!areFriends) throw forbidden('not friends with this user');

  let groupRows;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT (family_id, user_id) DO NOTHING`,
      [familyId, friendId],
    );
    await client.query(
      `INSERT INTO family_member_keys (family_id, member_id, wrapped, wrapped_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (family_id, member_id) DO UPDATE SET wrapped = EXCLUDED.wrapped, wrapped_by = EXCLUDED.wrapped_by, ts = now()`,
      [familyId, friendId, wrapped, actorId],
    );
    const { rows } = await client.query('SELECT id, name FROM groups WHERE family_id = $1', [familyId]);
    groupRows = rows;
    for (const g of groupRows) {
      await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [g.id, friendId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const found = await getFamilyByIdForUser(familyId, actorId);
  await broadcastToFamily(familyId, { type: 'family', action: 'members', familyId, members: found.members });

  // Keep any already-open group screens' member lists live for both the
  // newcomer and existing members — same shape as chat.js's addMember/
  // removeMember broadcast (computed here directly, not imported from
  // chat.js, to avoid a module cycle for one small query).
  for (const g of groupRows) {
    const { rows: memberIdRows } = await query('SELECT user_id FROM group_members WHERE group_id = $1', [g.id]);
    await broadcastToFamily(familyId, {
      type: 'group',
      group: { id: g.id, familyId, kind: 'family', name: g.name, members: memberIdRows.map((r) => r.user_id) },
    });
  }

  // The friend's own copy of the wrapped key, delivered live — `wrappedByPublicKey`
  // rides along exactly like friend_group_keys.wrappedByPublicKey so the
  // friend can unwrap via deriveSharedKey(myPriv, wrappedByPublicKey) without
  // the adder needing to already be in THEIR friends list either.
  const { rows: adderKeyRows } = await query('SELECT public_key FROM user_keys WHERE user_id = $1', [actorId]);
  broadcastToUsers([friendId], {
    type: 'familyMemberKey',
    familyId,
    wrapped,
    wrappedBy: actorId,
    wrappedByPublicKey: adderKeyRows[0]?.public_key ?? null,
  });

  return found;
}

/**
 * Every wrapped family anchor key `userId` holds (one per family they were
 * added-from-friends into), plus the wrapper's current public key — mirrors
 * friendChat.js's listFriendGroupKeys. A family the user joined by invite
 * code (not add-from-friends) has no row here; that's fine — they already
 * hold the key locally from the extended invite, nothing to deliver.
 */
export async function getFamilyMemberKeys(userId) {
  const { rows } = await query(
    `SELECT fmk.family_id, fmk.wrapped, fmk.wrapped_by, uk.public_key AS wrapped_by_public_key
     FROM family_member_keys fmk
     LEFT JOIN user_keys uk ON uk.user_id = fmk.wrapped_by
     WHERE fmk.member_id = $1`,
    [userId],
  );
  return rows.map((r) => ({ familyId: r.family_id, wrapped: r.wrapped, wrappedBy: r.wrapped_by, wrappedByPublicKey: r.wrapped_by_public_key ?? null }));
}

/**
 * Phase Y — pure auto-grant: any current key-holder (enforced client-side
 * only, by the caller never attempting this unless it actually holds the
 * family's ring — the server has no way to verify that, same trust model as
 * every other e2ee envelope in this codebase) may grant ANY other co-member
 * a wrapped copy of the family's anchor key — co-membership only, unlike
 * addMemberFromFriend above, NO friendship check. `wrapped` is
 * wrapKey(deriveSharedKey(actorPriv, memberPub), anchorKey) — an opaque
 * e2e:1: envelope; the server only ever checks its shape. Idempotent: ON
 * CONFLICT DO NOTHING on the (family_id, member_id) PK — first grant wins, a
 * concurrent/duplicate grant is a silent no-op (still returns success — see
 * server.js's route). Broadcasts only on an actual first-grant so the target
 * member's device doesn't get redundant deliveries for a no-op call.
 */
export async function grantFamilyKey({ familyId, actorId, memberId, wrapped }) {
  if (!memberId) throw badRequest('memberId is required');
  if (!isEnvelope(wrapped)) throw badRequest('wrapped must be an e2ee envelope');

  const { rowCount: actorIsMember } = await query(
    'SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2',
    [familyId, actorId],
  );
  if (!actorIsMember) throw forbidden('not a member of this family');

  const { rowCount: memberIsMember } = await query(
    'SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2',
    [familyId, memberId],
  );
  if (!memberIsMember) throw forbidden('member is not a member of this family');

  const { rowCount: inserted } = await query(
    `INSERT INTO family_member_keys (family_id, member_id, wrapped, wrapped_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (family_id, member_id) DO NOTHING`,
    [familyId, memberId, wrapped, actorId],
  );

  if (inserted) {
    const { rows: actorKeyRows } = await query('SELECT public_key FROM user_keys WHERE user_id = $1', [actorId]);
    await broadcastToUsers([memberId], {
      type: 'family',
      action: 'familyMemberKey',
      familyId,
      memberId,
      wrapped,
      wrappedBy: actorId,
      wrappedByPublicKey: actorKeyRows[0]?.public_key ?? null,
    });
  }

  return { granted: !!inserted };
}

/**
 * Deletes a family and every row scoped to it (used by leaveFamily when its
 * last member leaves). Order matters for FK safety: child rows (messages/
 * read_cursors/group_members reference groups; photos reference albums) go
 * before their parents. Every statement is scoped to THIS family's rows (by
 * family_id, or by group/album ids looked up from it) — never a blanket
 * DELETE — so a shared Postgres instance's other families/schemas are never
 * touched. Must run inside the caller's transaction; family_members for this
 * family is expected to already be empty by the time this is called (see
 * leaveFamily).
 */
async function deleteFamilyCascade(client, familyId) {
  const { rows: groupRows } = await client.query('SELECT id FROM groups WHERE family_id = $1', [familyId]);
  const groupIds = groupRows.map((g) => g.id);
  if (groupIds.length) {
    await client.query('DELETE FROM messages WHERE group_id = ANY($1)', [groupIds]);
    await client.query('DELETE FROM read_cursors WHERE group_id = ANY($1)', [groupIds]);
    await client.query('DELETE FROM group_members WHERE group_id = ANY($1)', [groupIds]);
  }
  await client.query('DELETE FROM groups WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM photos WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM albums WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM grocery_items WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM tasks WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM events WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM expenses WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM transfers WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM budgets WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM expense_categories WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM notes WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_key_rolls WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_member_keys WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_members WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM families WHERE id = $1', [familyId]);
}

/**
 * Self-leave — always allowed (unlike add-from-friends/rotate-key, no
 * owner-only restriction). Removes `userId` from family_members, every group
 * in the family (group_members + read_cursors), and their wrapped anchor-key
 * row (family_member_keys). An owner leaving auto-transfers ownership to the
 * oldest remaining member (fm.joined_at ASC, via family_members' default
 * SELECT ordering used elsewhere in this file); if no members remain, the
 * whole family and every row scoped to it is deleted (deleteFamilyCascade).
 * Broadcasts the updated roster (and any affected groups' member lists) to
 * whoever remains — a no-op broadcast surface when the family was deleted,
 * since there's nobody left to notify.
 */
export async function leaveFamily({ familyId, userId }) {
  const { rows } = await query('SELECT role FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, userId]);
  if (!rows.length) throw notFound('not a member of this family');
  const wasOwner = rows[0].role === 'owner';

  const client = await pool.connect();
  let deleted = false;
  let groupRows = [];
  try {
    await client.query('BEGIN');

    const { rows: myGroupRows } = await client.query(
      `SELECT g.id, g.name FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE g.family_id = $1 AND gm.user_id = $2`,
      [familyId, userId],
    );
    groupRows = myGroupRows;
    const groupIds = groupRows.map((g) => g.id);
    if (groupIds.length) {
      await client.query('DELETE FROM group_members WHERE group_id = ANY($1) AND user_id = $2', [groupIds, userId]);
      await client.query('DELETE FROM read_cursors WHERE group_id = ANY($1) AND user_id = $2', [groupIds, userId]);
    }
    await client.query('DELETE FROM family_member_keys WHERE family_id = $1 AND member_id = $2', [familyId, userId]);
    await client.query('DELETE FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, userId]);

    const { rows: remaining } = await client.query(
      'SELECT user_id FROM family_members WHERE family_id = $1 ORDER BY joined_at ASC',
      [familyId],
    );

    if (!remaining.length) {
      await deleteFamilyCascade(client, familyId);
      deleted = true;
    } else if (wasOwner) {
      await client.query(`UPDATE family_members SET role = 'owner' WHERE family_id = $1 AND user_id = $2`, [familyId, remaining[0].user_id]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (!deleted) {
    const members = await memberRows(familyId);
    await broadcastToFamily(familyId, { type: 'family', action: 'members', familyId, members });
    for (const g of groupRows) {
      const { rows: memberIdRows } = await query('SELECT user_id FROM group_members WHERE group_id = $1', [g.id]);
      await broadcastToFamily(familyId, {
        type: 'group',
        group: { id: g.id, familyId, kind: 'family', name: g.name, members: memberIdRows.map((r) => r.user_id) },
      });
    }
  }

  return { familyId, deleted };
}
