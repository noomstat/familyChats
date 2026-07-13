// Shared Calendar (#2). Same CRUD+realtime pattern as lists.js: every
// function is membership-checked — the caller (actor) must be a member of
// the family that owns the row, or a fresh 404 for an unknown id / 403 for
// someone else's family's row.
//
// Read-vs-write asymmetry, same as lists.js: listEvents degrades to an empty
// array for a family-less user; addEvent (which needs somewhere to attach the
// new row) throws 409 'not in a family' instead.
import { query } from './db.js';
import { broadcastToFamily } from './ws.js';
import { getActiveFamilyId } from './requestContext.js';

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

function mapEvent(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    notes: row.notes,
    startTs: row.start_ts.toISOString(),
    endTs: row.end_ts ? row.end_ts.toISOString() : null,
    allDay: row.all_day,
    createdBy: row.created_by,
    ts: row.ts.toISOString(),
  };
}

async function assertEventAccess(id, userId) {
  const { rows } = await query('SELECT * FROM events WHERE id = $1', [id]);
  const event = rows[0];
  if (!event) throw notFound('event not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || event.family_id !== familyId) throw forbidden('not a member of this family');
  return event;
}

/**
 * My family's events, optionally restricted to those overlapping [from, to]
 * (both ISO timestamps; an event overlaps when its start is on/before `to`
 * and its effective end — end_ts, or start_ts for point-in-time events — is
 * on/after `from`). Ordered by start_ts ascending.
 */
export async function listEvents(userId, { from, to } = {}) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];

  const params = [familyId];
  let sql = 'SELECT * FROM events WHERE family_id = $1';

  if (to !== undefined && to !== null && to !== '') {
    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) throw badRequest('to must be a valid ISO timestamp');
    params.push(toDate);
    sql += ` AND start_ts <= $${params.length}`;
  }
  if (from !== undefined && from !== null && from !== '') {
    const fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) throw badRequest('from must be a valid ISO timestamp');
    params.push(fromDate);
    sql += ` AND coalesce(end_ts, start_ts) >= $${params.length}`;
  }
  sql += ' ORDER BY start_ts ASC';

  const { rows } = await query(sql, params);
  return rows.map(mapEvent);
}

/** Insert an event (idempotent on `id`). Broadcasts `event`/`upsert` on a fresh insert. */
export async function addEvent({ id, title, notes, startTs, endTs, allDay, userId }) {
  if (!id) throw badRequest('id is required');
  if (typeof title !== 'string' || !title.trim()) throw badRequest('title is required');
  const startDate = new Date(startTs);
  if (Number.isNaN(startDate.getTime())) throw badRequest('startTs must be a valid ISO timestamp');
  let endDate = null;
  if (endTs !== undefined && endTs !== null) {
    endDate = new Date(endTs);
    if (Number.isNaN(endDate.getTime())) throw badRequest('endTs must be a valid ISO timestamp');
  }

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  const { rows } = await query(
    `INSERT INTO events (id, family_id, title, notes, start_ts, end_ts, all_day, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, title.trim(), notes ?? null, startDate, endDate, !!allDay, userId],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM events WHERE id = $1', [id]);
    return existing[0] ? mapEvent(existing[0]) : null;
  }

  const event = mapEvent(rows[0]);
  await broadcastToFamily(familyId, { type: 'event', action: 'upsert', event });
  return event;
}

/** Patches title/notes/startTs/endTs/allDay. Only keys present in `patch` are touched; `null` clears a nullable field. */
export async function updateEvent({ id, patch, userId }) {
  const event = await assertEventAccess(id, userId);
  const familyId = event.family_id;

  const sets = [];
  const params = [id];
  const addSet = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (patch.title !== undefined) {
    if (typeof patch.title !== 'string' || !patch.title.trim()) throw badRequest('title cannot be empty');
    addSet('title', patch.title.trim());
  }
  if (patch.notes !== undefined) {
    addSet('notes', patch.notes === null ? null : String(patch.notes));
  }
  if (patch.startTs !== undefined) {
    const startDate = new Date(patch.startTs);
    if (Number.isNaN(startDate.getTime())) throw badRequest('startTs must be a valid ISO timestamp');
    addSet('start_ts', startDate);
  }
  if (patch.endTs !== undefined) {
    let endDate = null;
    if (patch.endTs !== null) {
      endDate = new Date(patch.endTs);
      if (Number.isNaN(endDate.getTime())) throw badRequest('endTs must be a valid ISO timestamp');
    }
    addSet('end_ts', endDate);
  }
  if (patch.allDay !== undefined) {
    addSet('all_day', !!patch.allDay);
  }

  if (!sets.length) return mapEvent(event); // no-op patch

  const { rows } = await query(`UPDATE events SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  const updated = mapEvent(rows[0]);
  await broadcastToFamily(familyId, { type: 'event', action: 'upsert', event: updated });
  return updated;
}

export async function removeEvent({ id, userId }) {
  const event = await assertEventAccess(id, userId);
  await query('DELETE FROM events WHERE id = $1', [id]);
  await broadcastToFamily(event.family_id, { type: 'event', action: 'remove', id });
  return { id };
}
