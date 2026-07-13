// Phase V — friend E2EE chat: 1:1 DMs + friend groups. Builds on top of
// chat.js's group/message/read-cursor machinery (group_members, messages,
// read_cursors are reused completely unchanged — see chat.js's assertMember,
// which only ever checks group_members, never family membership) and
// friends.js's friendships table. A friend conversation is a `groups` row
// with `family_id NULL, kind = 'friends'` (see server/db/014_friend_convos.sql).
//
// Keying (the server never sees a conversation key or anyone's private key):
//  - 1:1 DM: no friend_group_keys rows at all — the key is pure client-side
//    X25519 Diffie-Hellman between the two members (app/src/crypto/
//    friends.ts's deriveSharedKey), nothing to store or transmit.
//  - Friend GROUP (3+ members, has a name): the creator generates a random
//    32-byte key client-side and wraps a copy to EVERY member (including
//    themselves) under that member's pairwise DH secret
//    (app/src/crypto/e2ee.ts's wrapKey) — those wrapped copies are what's
//    stored in friend_group_keys. `wrappedByPublicKey` rides along on every
//    read path so a member can unwrap even if the wrapper isn't (yet) their
//    own friend — the wrap is keyed by DH with the wrapper specifically, so
//    only that public key (not "some friend's" key) will ever recover it.
import crypto from 'node:crypto';
import { pool, query } from './db.js';
import { broadcastToUsers } from './ws.js';
import { assertMember, groupMemberIds, groupMeta } from './chat.js';

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

/** Deterministic id for the 1:1 DM between two users — order-independent, so find-or-create is a single idempotent INSERT ... ON CONFLICT DO NOTHING (no race). */
function dmGroupId(a, b) {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

async function isFriend(userId, otherId) {
  const { rowCount } = await query('SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2', [userId, otherId]);
  return !!rowCount;
}

/**
 * The client-facing shape of a friend conversation: group metadata + every
 * member's display name and current public key (so the client can derive/
 * unwrap the conversation key and render names without needing the viewer's
 * own friends list to already cover every member — e.g. a group member added
 * by someone else, not directly the viewer's friend).
 */
export async function getFriendGroupShape(groupId) {
  const group = await groupMeta(groupId);
  if (!group) return null;
  const members = await groupMemberIds(groupId);

  const { rows: userRows } = await query('SELECT id, name FROM users WHERE id = ANY($1)', [members]);
  const memberNames = {};
  for (const r of userRows) memberNames[r.id] = r.name;

  const memberPublicKeys = {};
  for (const id of members) memberPublicKeys[id] = null;
  const { rows: keyRows } = await query('SELECT user_id, public_key FROM user_keys WHERE user_id = ANY($1)', [members]);
  for (const r of keyRows) memberPublicKeys[r.user_id] = r.public_key;

  return { id: group.id, familyId: null, kind: 'friends', name: group.name, members, memberNames, memberPublicKeys };
}

/** Every friend-kind group id `userId` currently belongs to, oldest first. */
export async function listFriendGroupIds(userId) {
  const { rows } = await query(
    `SELECT g.id FROM groups g JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1 AND g.kind = 'friends' ORDER BY g.created_at ASC`,
    [userId],
  );
  return rows.map((r) => r.id);
}

/** `userId`'s own wrapped copy of every friend-group key they hold, plus the wrapper's current public key (so the client never needs the wrapper to already be in its own friends list to unwrap). */
export async function listFriendGroupKeys(userId) {
  const { rows } = await query(
    `SELECT fgk.group_id, fgk.wrapped, fgk.wrapped_by, uk.public_key AS wrapped_by_public_key
     FROM friend_group_keys fgk
     LEFT JOIN user_keys uk ON uk.user_id = fgk.wrapped_by
     WHERE fgk.member_id = $1`,
    [userId],
  );
  return rows.map((r) => ({ groupId: r.group_id, wrapped: r.wrapped, wrappedBy: r.wrapped_by, wrappedByPublicKey: r.wrapped_by_public_key ?? null }));
}

/**
 * Find-or-create the 1:1 DM between `userId` and `friendId`. Requires an
 * existing friendship (both directions are always inserted together — see
 * friends.js's connectByQr). No friend_group_keys rows are ever created for
 * a DM — see the module header.
 */
export async function openDm({ userId, friendId }) {
  if (!friendId) throw badRequest('friendId is required');
  if (friendId === userId) throw badRequest("can't DM yourself");
  if (!(await isFriend(userId, friendId))) throw forbidden('not friends with this user');

  const groupId = dmGroupId(userId, friendId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO groups (id, family_id, kind, name, created_by) VALUES ($1, NULL, 'friends', $2, $3) ON CONFLICT (id) DO NOTHING`,
      [groupId, 'Direct message', userId],
    );
    await client.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING',
      [groupId, userId, friendId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getFriendGroupShape(groupId);
}

/**
 * Creates a friend GROUP (name + members). `memberIds` are the OTHER
 * members (the creator is always included); every one of them must already
 * be the creator's friend. `wrappedKeys` is a { [memberId]: wrapped } map
 * produced entirely client-side (wrapKey(deriveSharedKey(myPriv, memberPub),
 * groupKey) for each member, including the creator themselves) — the server
 * only checks that every member has an entry, never what's inside it.
 */
export async function createFriendGroup({ userId, name, memberIds, wrappedKeys }) {
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');
  const others = [...new Set((memberIds ?? []).filter((id) => id && id !== userId))];
  if (!others.length) throw badRequest('at least one other member is required');

  const { rows: friendRows } = await query('SELECT friend_id FROM friendships WHERE user_id = $1 AND friend_id = ANY($2)', [userId, others]);
  const validFriends = new Set(friendRows.map((r) => r.friend_id));
  const invalid = others.filter((id) => !validFriends.has(id));
  if (invalid.length) throw badRequest(`not friends with: ${invalid.join(', ')}`);

  const allMembers = [userId, ...others];
  if (!wrappedKeys || typeof wrappedKeys !== 'object') throw badRequest('wrappedKeys is required');
  const missing = allMembers.filter((id) => typeof wrappedKeys[id] !== 'string' || !wrappedKeys[id]);
  if (missing.length) throw badRequest(`missing wrapped key for: ${missing.join(', ')}`);

  const groupId = crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO groups (id, family_id, kind, name, created_by) VALUES ($1, NULL, 'friends', $2, $3)`,
      [groupId, name.trim(), userId],
    );
    for (const memberId of allMembers) {
      await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, memberId]);
    }
    for (const memberId of allMembers) {
      await client.query(
        `INSERT INTO friend_group_keys (group_id, member_id, wrapped, wrapped_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (group_id, member_id) DO UPDATE SET wrapped = EXCLUDED.wrapped, wrapped_by = EXCLUDED.wrapped_by, ts = now()`,
        [groupId, memberId, wrappedKeys[memberId], userId],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const shape = await getFriendGroupShape(groupId);
  const wrapperPub = shape.memberPublicKeys[userId] ?? null;
  await broadcastToUsers(others, { type: 'group', group: shape });
  for (const memberId of others) {
    broadcastToUsers([memberId], { type: 'friendGroupKey', groupId, wrapped: wrappedKeys[memberId], wrappedBy: userId, wrappedByPublicKey: wrapperPub });
  }
  return shape;
}

/**
 * Adds a member to an existing friend group. `actorId` must already be a
 * member (and — implicitly, since they can only wrap it correctly if they
 * actually hold it — the group key), `memberId` must be `actorId`'s friend.
 * `wrapped` is the group key wrapped for the newcomer under
 * deriveSharedKey(actorPriv, memberPub), same client-side construction as
 * createFriendGroup — mirrors the Phase N key-roll pattern of "any current
 * holder can extend access to a newcomer".
 */
export async function addFriendGroupMember({ groupId, actorId, memberId, wrapped }) {
  const group = await assertMember(groupId, actorId);
  if (group.kind !== 'friends') throw badRequest('not a friend conversation');
  if (!memberId) throw badRequest('memberId is required');
  if (typeof wrapped !== 'string' || !wrapped) throw badRequest('wrapped is required');
  if (!(await isFriend(actorId, memberId))) throw badRequest('not friends with this user');

  const { rowCount: already } = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, memberId]);
  if (already) throw badRequest('already a member');

  await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, memberId]);
  await query(
    `INSERT INTO friend_group_keys (group_id, member_id, wrapped, wrapped_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_id, member_id) DO UPDATE SET wrapped = EXCLUDED.wrapped, wrapped_by = EXCLUDED.wrapped_by, ts = now()`,
    [groupId, memberId, wrapped, actorId],
  );

  const shape = await getFriendGroupShape(groupId);
  await broadcastToUsers(shape.members, { type: 'group', group: shape });
  broadcastToUsers([memberId], { type: 'friendGroupKey', groupId, wrapped, wrappedBy: actorId, wrappedByPublicKey: shape.memberPublicKeys[actorId] ?? null });
  return shape;
}

/** Self-removal — how "leave group" works (mirrors chat.js's removeMember). Drops this user's wrapped key too, so a later re-add gets a fresh wrap rather than resurrecting a stale one. */
export async function leaveFriendGroup({ groupId, userId }) {
  const group = await assertMember(groupId, userId);
  if (group.kind !== 'friends') throw badRequest('not a friend conversation');

  await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  await query('DELETE FROM friend_group_keys WHERE group_id = $1 AND member_id = $2', [groupId, userId]);

  const shape = await getFriendGroupShape(groupId);
  // Broadcast to the remaining members AND the leaver — the leaver's own
  // GROUP_UPSERT reducer drops it locally once it sees itself missing from
  // `members` (same pattern as chat.js's removeMember/broadcastToFamily).
  await broadcastToUsers([...shape.members, userId], { type: 'group', group: shape });
  return shape;
}

/** Renames a friend group (mirrors chat.js's renameGroup). */
export async function renameFriendGroup({ groupId, userId, name }) {
  const group = await assertMember(groupId, userId);
  if (group.kind !== 'friends') throw badRequest('not a friend conversation');
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');

  await query('UPDATE groups SET name = $1 WHERE id = $2', [name.trim(), groupId]);
  const shape = await getFriendGroupShape(groupId);
  await broadcastToUsers(shape.members, { type: 'group', group: shape });
  return shape;
}
