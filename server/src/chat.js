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

const DEFAULT_MESSAGE_LIMIT = 30;

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

async function userFamilyId(userId) {
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

async function groupMeta(groupId) {
  const { rows } = await query('SELECT id, family_id, name, created_by FROM groups WHERE id = $1', [groupId]);
  return rows[0] ?? null;
}

async function groupMemberIds(groupId) {
  const { rows } = await query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
  return rows.map((r) => r.user_id);
}

/** Loads the group and asserts `userId` is one of its members. Throws 404/403. */
async function assertMember(groupId, userId) {
  const group = await groupMeta(groupId);
  if (!group) throw notFound('group not found');
  const { rowCount } = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  if (!rowCount) throw forbidden('not a member of this group');
  return group;
}

function groupShape(group, members) {
  return { id: group.id, familyId: group.family_id, name: group.name, members };
}

// ── Bootstrap / sync ─────────────────────────────────────────

/**
 * Everything a client needs to render the chat list + open any thread cold:
 * every group the user belongs to, its last 30 messages, unread count, and
 * every member's read cursor (so receipts can be computed client-side).
 */
export async function getBootstrap(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return { groups: [], grocery: [], tasks: [], events: [], albums: [], serverTime: new Date().toISOString() };

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

    const { rows: msgRows } = await query(
      'SELECT * FROM messages WHERE group_id = $1 ORDER BY ts DESC LIMIT $2',
      [g.id, DEFAULT_MESSAGE_LIMIT],
    );
    const latest = msgRows.reverse().map(mapMessage);

    const { rows: cursorRows } = await query(
      'SELECT user_id, last_read_ts FROM read_cursors WHERE group_id = $1',
      [g.id],
    );
    const cursors = {};
    for (const c of cursorRows) cursors[c.user_id] = c.last_read_ts.toISOString();
    const myCursor = cursors[userId] ?? null;

    const unreadParams = myCursor ? [g.id, userId, myCursor] : [g.id, userId];
    const unreadSql = `SELECT count(*)::int AS n FROM messages WHERE group_id = $1 AND author_id <> $2${myCursor ? ' AND ts > $3' : ''}`;
    const { rows: unreadRows } = await query(unreadSql, unreadParams);

    groups.push({
      id: g.id,
      familyId: g.family_id,
      name: g.name,
      members,
      latest,
      unread: unreadRows[0].n,
      lastReadTs: myCursor,
      cursors,
    });
  }

  const grocery = await listGrocery(userId);
  const tasks = await listTasks(userId);
  const events = await listEvents(userId);
  // Albums ship with their photoCount/coverPath aggregates, but deliberately
  // WITHOUT their photos: a family's photo collection grows unboundedly, so
  // photos are fetched lazily per album via GET /albums/:id/photos instead of
  // riding along in bootstrap like the other (family-scale) lists.
  const albums = await listAlbums(userId);

  return { groups, grocery, tasks, events, albums, serverTime: new Date().toISOString() };
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

  const { rows: groupRows } = await query(
    'SELECT group_id FROM group_members WHERE user_id = $1',
    [userId],
  );
  const groupIds = groupRows.map((r) => r.group_id);
  if (!groupIds.length) return { messages: [], reads: [], grocery, tasks, events, albums, serverTime };

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
    grocery,
    tasks,
    events,
    albums,
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
 */
export async function createMessage({ id, groupId, authorId, kind = 'text', body, loc, live }) {
  if (!id) throw badRequest('id is required');
  const group = await assertMember(groupId, authorId);
  if (!['text', 'loc', 'voice'].includes(kind)) throw badRequest('invalid kind');

  const storedLoc = loc ? { ...loc, ...(live ? { live: true } : {}) } : null;

  const { rows } = await query(
    `INSERT INTO messages (id, group_id, author_id, kind, body, loc)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, groupId, authorId, kind, body ?? null, storedLoc ? JSON.stringify(storedLoc) : null],
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
    await notifyUsers({
      userIds: recipients,
      title: group.name,
      body: `${authorName}: ${body || '📍 shared a location'}`,
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
