// Family Chat: groups, membership, messages, read cursors. Every function is
// membership-checked — the caller (author/actor) must be a member of the
// family AND (for group-scoped ops) a member of the group itself.
import crypto from 'node:crypto';
import { pool, query } from './db.js';
import { broadcastToUsers, broadcastToFamily } from './ws.js';
import { notifyUsers } from './notifications.js';
import { listGrocery, listTasks } from './lists.js';
import { listEvents } from './events.js';
import { listAlbums } from './albums.js';
import { getFinance, listCategories } from './finance.js';
import { listKeyRolls, getFamilyMemberKeys } from './family.js';
import { listNotes } from './notes.js';
import { getFriends } from './friends.js';
import { getActiveFamilyId } from './requestContext.js';
// Phase V — friend-kind groups (1:1 DMs + friend groups) are family-
// independent (no family_id) but still ride bootstrap/sync alongside the
// active family's groups. friendChat.js imports assertMember/
// groupMemberIds/groupMeta back from this module — safe as an ES module
// circular import since neither side touches the other at module-evaluation
// time, only inside function bodies called after both modules finish loading.
import { listFriendGroupIds, listFriendGroupKeys, getFriendGroupShape } from './friendChat.js';

const DEFAULT_MESSAGE_LIMIT = 30;

// Phase K — E2EE envelope prefix. The server never decrypts; it only checks
// for this prefix to (a) enforce that e2ee families' text/loc messages are
// actually encrypted, and (b) degrade the push preview so plaintext never
// leaves the device. Keep in sync with app/src/crypto/e2ee.ts's ENVELOPE_PREFIX.
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

function mapMessage(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    kind: row.kind,
    body: row.body,
    loc: row.loc ?? null,
    mediaPath: row.media_path,
    durationMs: row.duration_ms,
    ts: row.ts.toISOString(),
  };
}

// Phase S — see lists.js's copy of this helper for the request-context rationale.
async function userFamilyId(userId) {
  const active = getActiveFamilyId();
  if (active) return active;
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

export async function groupMeta(groupId) {
  const { rows } = await query('SELECT id, family_id, name, created_by, kind FROM groups WHERE id = $1', [groupId]);
  return rows[0] ?? null;
}

async function familyE2EE(familyId) {
  const { rows } = await query('SELECT e2ee FROM families WHERE id = $1', [familyId]);
  return !!rows[0]?.e2ee;
}

export async function groupMemberIds(groupId) {
  const { rows } = await query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
  return rows.map((r) => r.user_id);
}

/** Loads the group and asserts `userId` is one of its members. Throws 404/403.
 * Deliberately family-independent: it only ever checks group_members, never
 * family_members — this is what lets friend-kind groups (no family_id) reuse
 * every message/read-cursor code path in this file unchanged (Phase V). */
export async function assertMember(groupId, userId) {
  const group = await groupMeta(groupId);
  if (!group) throw notFound('group not found');
  const { rowCount } = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  if (!rowCount) throw forbidden('not a member of this group');
  return group;
}

function groupShape(group, members) {
  return { id: group.id, familyId: group.family_id, kind: group.kind ?? 'family', name: group.name, members };
}

/** Bootstrap's per-group shape (latest messages + read cursors + unread count) for one already-known group id — shared by the family-groups loop and the friend-groups loop below. */
async function bootstrapMessagesFor(groupId, userId) {
  const { rows: msgRows } = await query(
    'SELECT * FROM messages WHERE group_id = $1 ORDER BY ts DESC LIMIT $2',
    [groupId, DEFAULT_MESSAGE_LIMIT],
  );
  const latest = msgRows.reverse().map(mapMessage);

  const { rows: cursorRows } = await query('SELECT user_id, last_read_ts FROM read_cursors WHERE group_id = $1', [groupId]);
  const cursors = {};
  for (const c of cursorRows) cursors[c.user_id] = c.last_read_ts.toISOString();
  const myCursor = cursors[userId] ?? null;

  const unreadParams = myCursor ? [groupId, userId, myCursor] : [groupId, userId];
  const unreadSql = `SELECT count(*)::int AS n FROM messages WHERE group_id = $1 AND author_id <> $2${myCursor ? ' AND ts > $3' : ''}`;
  const { rows: unreadRows } = await query(unreadSql, unreadParams);

  return { latest, unread: unreadRows[0].n, lastReadTs: myCursor, cursors };
}

/**
 * Phase V — every friend-kind group (DMs + friend groups) `userId` belongs
 * to, in the SAME bootstrap shape as a family group (latest/unread/cursors),
 * plus this user's wrapped friend-group keys. Family-independent — computed
 * regardless of the active family, same as `friends` — so it rides in BOTH
 * the family-less early-return and the normal path below.
 */
async function friendGroupsBootstrapFor(userId) {
  const groupIds = await listFriendGroupIds(userId);
  const friendGroups = [];
  for (const groupId of groupIds) {
    const shape = await getFriendGroupShape(groupId);
    if (!shape) continue;
    const msgs = await bootstrapMessagesFor(groupId, userId);
    friendGroups.push({ ...shape, ...msgs });
  }
  const friendGroupKeys = await listFriendGroupKeys(userId);
  return { friendGroups, friendGroupKeys };
}

// ── Bootstrap / sync ─────────────────────────────────────────

/**
 * Everything a client needs to render the chat list + open any thread cold:
 * every group the user belongs to, its last 30 messages, unread count, and
 * every member's read cursor (so receipts can be computed client-side).
 */
export async function getBootstrap(userId) {
  // Phase U — friends are user-level and family-independent (unlike every
  // other bootstrap slice below), so they're fetched once up top and
  // included in BOTH the family-less early-return and the normal path.
  const friends = await getFriends(userId);
  // Phase V — same family-independence as `friends` above.
  const { friendGroups, friendGroupKeys } = await friendGroupsBootstrapFor(userId);
  // Phase X — my wrapped family anchor keys (one per family I was added to
  // via add-from-friends, not by invite code), same family-independence as
  // `friends`/`friendGroupKeys` above — a newly-added member may not even
  // have this family as their active one yet, so this must ride in BOTH the
  // family-less early-return and the normal path below.
  const familyMemberKeys = await getFamilyMemberKeys(userId);

  const familyId = await userFamilyId(userId);
  if (!familyId) {
    return {
      groups: [],
      grocery: [],
      tasks: [],
      events: [],
      albums: [],
      expenses: [],
      transfers: [],
      budget: null,
      categories: [],
      keyRolls: [],
      notes: [],
      friends,
      friendGroups,
      friendGroupKeys,
      familyMemberKeys,
      familyMemberKeyHolders: [],
      serverTime: new Date().toISOString(),
    };
  }

  const { rows: groupRows } = await query(
    `SELECT g.id, g.family_id, g.name
     FROM groups g JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1 AND g.family_id = $2
     ORDER BY g.created_at ASC`,
    [userId, familyId],
  );

  const groups = [];
  for (const g of groupRows) {
    const members = await groupMemberIds(g.id);
    const msgs = await bootstrapMessagesFor(g.id, userId);
    groups.push({ id: g.id, familyId: g.family_id, kind: 'family', name: g.name, members, ...msgs });
  }

  const grocery = await listGrocery(userId);
  const tasks = await listTasks(userId);
  const events = await listEvents(userId);
  // Albums ship with their photoCount/coverPath aggregates, but deliberately
  // WITHOUT their photos: a family's photo collection grows unboundedly, so
  // photos are fetched lazily per album via GET /albums/:id/photos instead of
  // riding along in bootstrap like the other (family-scale) lists.
  const albums = await listAlbums(userId);
  const { expenses, transfers, budget } = await getFinance(userId);
  // Phase R — family's custom expense categories, full list (family-scale,
  // like grocery/tasks/events) — the 5 built-ins are client-side constants
  // and never ride here.
  const categories = await listCategories(userId);
  // Phase N — every key roll the family has ever produced, oldest first, so
  // a cold client can fixpoint-replay the whole rotation chain from its
  // anchor (invite) key. Order doesn't matter to the replay itself, but
  // shipping it chronologically means the common case (no gaps) resolves in
  // one pass.
  const keyRolls = await listKeyRolls(familyId);
  // Phase P — family-scale like grocery/tasks/events (a handful to a few
  // dozen rows), so the whole list rides along in bootstrap same as those.
  const notes = await listNotes(userId);
  // Phase Y — every active-family member id that already holds a wrapped
  // copy of the anchor key (a family_member_keys row), so the client's
  // auto-grant sweep (grantKeysToKeylessMembers) knows who NOT to re-grant
  // without needing a separate round-trip. Family-scale (one row per
  // member), full resend same as the other bootstrap-only lists above.
  const { rows: holderRows } = await query('SELECT member_id FROM family_member_keys WHERE family_id = $1', [familyId]);
  const familyMemberKeyHolders = holderRows.map((r) => r.member_id);

  return { groups, grocery, tasks, events, albums, expenses, transfers, budget, categories, keyRolls, notes, friends, friendGroups, friendGroupKeys, familyMemberKeys, familyMemberKeyHolders, serverTime: new Date().toISOString() };
}

/**
 * WS-reconnect catch-up: everything new across all my groups since `afterIso`,
 * plus grocery/tasks/events/albums. Unlike messages/reads (which are filtered
 * by `after`), grocery items, tasks, events, and albums are family-scale (a
 * handful to a few dozen rows) so the simplest-correct choice is to just
 * resend the full current list on every sync rather than track per-row change
 * timestamps/tombstones for deletes. Photos deliberately diverge from that
 * full-resend pattern: they grow unboundedly, so they're never in sync —
 * clients refetch GET /albums/:id/photos for whichever album they're viewing.
 */
export async function getSyncSince(userId, afterIso) {
  const serverTime = new Date().toISOString();
  const after = new Date(afterIso);
  if (Number.isNaN(after.getTime())) throw badRequest('after must be a valid ISO timestamp');

  const grocery = await listGrocery(userId);
  const tasks = await listTasks(userId);
  const events = await listEvents(userId);
  const albums = await listAlbums(userId);
  const { expenses, transfers, budget } = await getFinance(userId);
  // Phase R — full resend on every sync, same as grocery/tasks/events/albums
  // above (family-scale, simplest-correct beats per-row change tracking).
  const categories = await listCategories(userId);
  // Phase P — full resend on every sync, same as grocery/tasks/events/albums
  // above (family-scale, simplest-correct beats per-row change tracking).
  const notes = await listNotes(userId);
  // Phase U — full resend on every sync, same as grocery/tasks/events/albums
  // above. Unlike everything else on this page, friends are user-level (not
  // family-scoped) — computed unconditionally, same as keyRolls' familyId
  // lookup below, so a family-less user's sync still carries them.
  const friends = await getFriends(userId);
  // Phase V — friend-kind groups' metadata (name/members/keys), full resend
  // same as `friends` above (user-scale, family-independent). Their actual
  // NEW messages/reads ride the `messages`/`reads` delta below for free —
  // that query is already keyed off ALL of a user's group memberships with
  // no family filter, so it was covering friend groups even before this
  // phase existed; only the group metadata itself needed adding here.
  const friendGroupIds = await listFriendGroupIds(userId);
  const friendGroups = [];
  for (const groupId of friendGroupIds) {
    const shape = await getFriendGroupShape(groupId);
    if (shape) friendGroups.push(shape);
  }
  const friendGroupKeys = await listFriendGroupKeys(userId);

  const { rows: groupRows } = await query(
    'SELECT group_id FROM group_members WHERE user_id = $1',
    [userId],
  );
  const groupIds = groupRows.map((r) => r.group_id);

  // Phase N — key rolls created since `after`, so a member who was OFFLINE
  // through a rotation (and thus missed the live `keyroll` WS broadcast) still
  // catches up on reconnect via this delta path, instead of showing the
  // post-rotation messages permanently locked until a full re-bootstrap. These
  // are family-scoped (NOT group-scoped like messages/reads), so they're
  // computed BEFORE the no-groups early-return below — a member is never in a
  // group-less state that should silently drop key rolls.
  const familyId = await userFamilyId(userId);
  const { rows: rollRows } = familyId
    ? await query(
        'SELECT id, family_id, wrapped, created_by, created_at FROM family_key_rolls WHERE family_id = $1 AND created_at > $2 ORDER BY created_at ASC',
        [familyId, after],
      )
    : { rows: [] };
  const keyRolls = rollRows.map((r) => ({ id: r.id, familyId: r.family_id, wrapped: r.wrapped, createdBy: r.created_by, createdAt: r.created_at.toISOString() }));

  if (!groupIds.length) return { messages: [], reads: [], keyRolls, grocery, tasks, events, albums, expenses, transfers, budget, categories, notes, friends, friendGroups, friendGroupKeys, serverTime };

  const { rows: msgRows } = await query(
    'SELECT * FROM messages WHERE group_id = ANY($1) AND ts > $2 ORDER BY ts ASC',
    [groupIds, after],
  );
  const { rows: readRows } = await query(
    'SELECT group_id, user_id, last_read_ts FROM read_cursors WHERE group_id = ANY($1) AND last_read_ts > $2',
    [groupIds, after],
  );

  return {
    messages: msgRows.map(mapMessage),
    reads: readRows.map((r) => ({ groupId: r.group_id, userId: r.user_id, lastReadTs: r.last_read_ts.toISOString() })),
    keyRolls,
    grocery,
    tasks,
    events,
    albums,
    expenses,
    transfers,
    budget,
    categories,
    notes,
    friends,
    friendGroups,
    friendGroupKeys,
    serverTime,
  };
}

// ── Messages ─────────────────────────────────────────────────

export async function getMessages(groupId, userId, { before, limit = DEFAULT_MESSAGE_LIMIT } = {}) {
  await assertMember(groupId, userId);
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_MESSAGE_LIMIT, 1), 100);

  const params = [groupId];
  let sql = 'SELECT * FROM messages WHERE group_id = $1';
  if (before) {
    const beforeDate = new Date(before);
    if (Number.isNaN(beforeDate.getTime())) throw badRequest('before must be a valid ISO timestamp');
    params.push(beforeDate);
    sql += ` AND ts < $${params.length}`;
  }
  params.push(safeLimit);
  sql += ` ORDER BY ts DESC LIMIT $${params.length}`;

  const { rows } = await query(sql, params);
  return rows.reverse().map(mapMessage);
}

/**
 * Insert a message (idempotent on `id`). On a fresh insert, broadcasts a
 * `message` WS event to every group member and enqueues a push to everyone
 * except the author. A duplicate id (client retry) is a silent no-op that
 * returns the already-stored row.
 *
 * `mediaPath`/`durationMs` are for `kind: 'voice'` (Phase F) — a public
 * '/uploads/<name>' path and the clip length in ms. Both are simply columns
 * that ride along; text/loc messages pass them as null.
 */
export async function createMessage({ id, groupId, authorId, kind = 'text', body, loc, live, mediaPath, durationMs }) {
  if (!id) throw badRequest('id is required');
  const group = await assertMember(groupId, authorId);
  if (!['text', 'loc', 'voice'].includes(kind)) throw badRequest('invalid kind');

  // E2EE enforcement (server never decrypts — it only checks shape): once a
  // family has turned encryption on, its text/loc messages MUST arrive as an
  // envelope — and Phase V: EVERY friend conversation (no family, no opt-in)
  // is unconditionally encrypted, since there's no server-held key to fall
  // back to. `||` short-circuits familyE2EE(group.family_id) — never called
  // for a friends-kind group, where family_id is NULL anyway. Voice stays
  // unencrypted in v1 (files, not covered — see plan's out-of-scope list),
  // so it's exempt. An encrypted loc message carries its {label, meta, live}
  // inside the envelope instead of the `loc` column — the app-side mapping
  // reads it back out of the decrypted body.
  const needsE2ee = group.kind === 'friends' || (await familyE2EE(group.family_id));
  if (kind !== 'voice' && needsE2ee && !isEnvelope(body)) {
    throw badRequest('this conversation requires encrypted messages');
  }

  const storedLoc = loc ? { ...loc, ...(live ? { live: true } : {}) } : null;

  const { rows } = await query(
    `INSERT INTO messages (id, group_id, author_id, kind, body, loc, media_path, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, groupId, authorId, kind, body ?? null, storedLoc ? JSON.stringify(storedLoc) : null, mediaPath ?? null, durationMs ?? null],
  );

  if (!rows[0]) {
    // Already stored (duplicate/retry) — return it as-is, no re-broadcast/notify.
    const { rows: existing } = await query('SELECT * FROM messages WHERE id = $1', [id]);
    return existing[0] ? mapMessage(existing[0]) : null;
  }

  const message = mapMessage(rows[0]);
  const memberIds = await groupMemberIds(groupId);
  broadcastToUsers(memberIds, { type: 'message', message });

  const recipients = memberIds.filter((m) => m !== authorId);
  if (recipients.length) {
    const { rows: authorRows } = await query('SELECT name FROM users WHERE id = $1', [authorId]);
    const authorName = authorRows[0]?.name ?? 'Someone';
    // Encrypted bodies must never leak into a push payload — the server
    // can't read them either, but even echoing the ciphertext string back
    // out via a notification would be a needless exposure surface.
    const preview = isEnvelope(body) ? '🔒 New message' : kind === 'voice' ? '🎤 Voice message' : (body || '📍 shared a location');
    // Phase V — a DM's `group.name` is an internal placeholder (there's no
    // single meaningful "group name" for two people — see friendChat.js's
    // openDm), so the notification title uses the sender's name for any
    // friends-kind conversation instead (works for both DMs and named friend
    // groups alike, same as how a family group already uses its own name).
    await notifyUsers({
      userIds: recipients,
      title: group.kind === 'friends' ? authorName : group.name,
      body: isEnvelope(body) ? preview : `${authorName}: ${preview}`,
      data: { type: 'message', groupId },
    });
  }

  return message;
}

/** Upsert a read cursor (never moves it backwards) and broadcast the update. */
export async function setRead(groupId, userId, ts) {
  await assertMember(groupId, userId);
  const tsDate = new Date(ts);
  if (Number.isNaN(tsDate.getTime())) throw badRequest('ts must be a valid ISO timestamp');

  await query(
    `INSERT INTO read_cursors (group_id, user_id, last_read_ts) VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id)
     DO UPDATE SET last_read_ts = GREATEST(read_cursors.last_read_ts, EXCLUDED.last_read_ts)`,
    [groupId, userId, tsDate],
  );

  const { rows } = await query('SELECT last_read_ts FROM read_cursors WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  const lastReadTs = rows[0].last_read_ts.toISOString();

  const memberIds = await groupMemberIds(groupId);
  broadcastToUsers(memberIds, { type: 'read', groupId, userId, lastReadTs });

  return { lastReadTs };
}

// ── Group CRUD ───────────────────────────────────────────────

export async function createGroup({ id, familyId, name, memberIds, createdBy }) {
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');
  if (!familyId) throw badRequest('familyId is required');

  const allMembers = [...new Set([...(memberIds ?? []), createdBy])];
  const { rows: validRows } = await query(
    'SELECT user_id FROM family_members WHERE family_id = $1 AND user_id = ANY($2)',
    [familyId, allMembers],
  );
  const valid = new Set(validRows.map((r) => r.user_id));
  const invalid = allMembers.filter((m) => !valid.has(m));
  if (invalid.length) throw badRequest(`not family members: ${invalid.join(', ')}`);

  const groupId = id || crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO groups (id, family_id, name, created_by) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [groupId, familyId, name.trim(), createdBy],
    );
    for (const memberId of allMembers) {
      await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, memberId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const group = await groupMeta(groupId);
  const members = await groupMemberIds(groupId);
  const shape = groupShape(group, members);
  await broadcastToFamily(familyId, { type: 'group', group: shape });
  return shape;
}

export async function renameGroup({ groupId, userId, name }) {
  const group = await assertMember(groupId, userId);
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');

  await query('UPDATE groups SET name = $1 WHERE id = $2', [name.trim(), groupId]);
  const members = await groupMemberIds(groupId);
  const shape = groupShape({ ...group, name: name.trim() }, members);
  await broadcastToFamily(group.family_id, { type: 'group', group: shape });
  return shape;
}

export async function addMember({ groupId, actorId, userId }) {
  const group = await assertMember(groupId, actorId);
  if (!userId) throw badRequest('userId is required');
  const { rowCount } = await query('SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2', [group.family_id, userId]);
  if (!rowCount) throw badRequest('user is not a member of this family');

  await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, userId]);
  const members = await groupMemberIds(groupId);
  const shape = groupShape(group, members);
  await broadcastToFamily(group.family_id, { type: 'group', group: shape });
  return shape;
}

/** Removes a member from a group. Self-removal is how "leave group" works. */
export async function removeMember({ groupId, actorId, userId }) {
  const group = await assertMember(groupId, actorId);
  if (!userId) throw badRequest('userId is required');

  await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  const members = await groupMemberIds(groupId);
  const shape = groupShape(group, members);
  // Broadcast to the whole family (not just remaining members) so the
  // removed/leaving user's own client also learns it lost access.
  await broadcastToFamily(group.family_id, { type: 'group', group: shape });
  return shape;
}
