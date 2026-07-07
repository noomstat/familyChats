// Shared Grocery List (#3) + Shared Tasks (#4). Same CRUD+realtime pattern as
// chat.js twice over — every function is membership-checked: the caller
// (actor) must be a member of the family that owns the row, or a fresh 404
// for an unknown id / 403 for someone else's family's row.
//
// Read-vs-write asymmetry, chosen for consistency with chat.js's getBootstrap
// (which returns `{ groups: [] }` rather than an error for a family-less
// user): listGrocery/listTasks degrade to an empty array when the caller
// isn't in a family yet. Mutations that need somewhere to attach the new row
// (addGrocery/addTask/clearChecked) throw 409 'not in a family' instead —
// there's nothing wrong with the request shape (unlike a 400), the caller's
// account just isn't in a state that allows it yet.
import { query } from './db.js';
import { broadcastToFamily } from './ws.js';
import { notifyUsers } from './notifications.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

async function userFamilyId(userId) {
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

/** Formats a pg DATE column (parsed as a local-midnight JS Date) back to 'YYYY-MM-DD' without any UTC shift. */
function dateOnly(d) {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapGrocery(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    label: row.label,
    qty: row.qty,
    checkedBy: row.checked_by,
    checkedAt: row.checked_at ? row.checked_at.toISOString() : null,
    createdBy: row.created_by,
    ts: row.ts.toISOString(),
  };
}

function mapTask(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    notes: row.notes,
    assigneeId: row.assignee_id,
    dueDate: dateOnly(row.due_date),
    done: row.done,
    doneBy: row.done_by,
    doneAt: row.done_at ? row.done_at.toISOString() : null,
    createdBy: row.created_by,
    ts: row.ts.toISOString(),
  };
}

async function assertGroceryAccess(id, userId) {
  const { rows } = await query('SELECT * FROM grocery_items WHERE id = $1', [id]);
  const item = rows[0];
  if (!item) throw notFound('grocery item not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || item.family_id !== familyId) throw forbidden('not a member of this family');
  return item;
}

async function assertTaskAccess(id, userId) {
  const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
  const task = rows[0];
  if (!task) throw notFound('task not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || task.family_id !== familyId) throw forbidden('not a member of this family');
  return task;
}

// ── Grocery ──────────────────────────────────────────────────

export async function listGrocery(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];
  const { rows } = await query('SELECT * FROM grocery_items WHERE family_id = $1 ORDER BY ts ASC', [familyId]);
  return rows.map(mapGrocery);
}

/** Insert a grocery item (idempotent on `id`). Broadcasts `grocery`/`upsert` on a fresh insert. */
export async function addGrocery({ id, label, qty, userId }) {
  if (!id) throw badRequest('id is required');
  if (typeof label !== 'string' || !label.trim()) throw badRequest('label is required');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  const { rows } = await query(
    `INSERT INTO grocery_items (id, family_id, label, qty, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, label.trim(), qty ?? null, userId],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM grocery_items WHERE id = $1', [id]);
    return existing[0] ? mapGrocery(existing[0]) : null;
  }

  const item = mapGrocery(rows[0]);
  await broadcastToFamily(familyId, { type: 'grocery', action: 'upsert', item });
  return item;
}

/** Flips checked <-> unchecked (setting/clearing checked_by + checked_at). */
export async function toggleGrocery({ id, userId }) {
  const item = await assertGroceryAccess(id, userId);
  const checked = !!item.checked_by;

  const { rows } = await query(
    checked
      ? 'UPDATE grocery_items SET checked_by = NULL, checked_at = NULL WHERE id = $1 RETURNING *'
      : 'UPDATE grocery_items SET checked_by = $2, checked_at = now() WHERE id = $1 RETURNING *',
    checked ? [id] : [id, userId],
  );

  const updated = mapGrocery(rows[0]);
  await broadcastToFamily(item.family_id, { type: 'grocery', action: 'upsert', item: updated });
  return updated;
}

export async function removeGrocery({ id, userId }) {
  const item = await assertGroceryAccess(id, userId);
  await query('DELETE FROM grocery_items WHERE id = $1', [id]);
  await broadcastToFamily(item.family_id, { type: 'grocery', action: 'remove', ids: [id] });
  return { id };
}

/** Deletes every checked item in the caller's family. */
export async function clearChecked(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  const { rows } = await query(
    'DELETE FROM grocery_items WHERE family_id = $1 AND checked_by IS NOT NULL RETURNING id',
    [familyId],
  );
  const ids = rows.map((r) => r.id);
  if (ids.length) await broadcastToFamily(familyId, { type: 'grocery', action: 'clear-checked', ids });
  return { ids };
}

// ── Tasks ────────────────────────────────────────────────────

export async function listTasks(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];
  const { rows } = await query('SELECT * FROM tasks WHERE family_id = $1 ORDER BY ts ASC', [familyId]);
  return rows.map(mapTask);
}

/**
 * Insert a task (idempotent on `id`). Broadcasts `task`/`upsert` on a fresh
 * insert and, if assigned to someone other than the creator, enqueues a
 * "New task" push to the assignee.
 */
export async function addTask({ id, title, notes, assigneeId, dueDate, userId }) {
  if (!id) throw badRequest('id is required');
  if (typeof title !== 'string' || !title.trim()) throw badRequest('title is required');
  if (dueDate != null && !DATE_RE.test(dueDate)) throw badRequest('dueDate must be YYYY-MM-DD');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  if (assigneeId) {
    const { rowCount } = await query('SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, assigneeId]);
    if (!rowCount) throw badRequest('assignee is not a family member');
  }

  const { rows } = await query(
    `INSERT INTO tasks (id, family_id, title, notes, assignee_id, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, title.trim(), notes ?? null, assigneeId ?? null, dueDate ?? null, userId],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    return existing[0] ? mapTask(existing[0]) : null;
  }

  const task = mapTask(rows[0]);
  await broadcastToFamily(familyId, { type: 'task', action: 'upsert', task });

  if (assigneeId && assigneeId !== userId) {
    const { rows: creatorRows } = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const creatorName = creatorRows[0]?.name ?? 'Someone';
    await notifyUsers({
      userIds: [assigneeId],
      title: 'New task',
      body: `${creatorName}: ${title.trim()}`,
      data: { type: 'task', id },
    });
  }

  return task;
}

/** Patches title/notes/assignee/due date. Only keys present in `patch` are touched; `null` clears a nullable field. */
export async function updateTask({ id, patch, userId }) {
  const task = await assertTaskAccess(id, userId);
  const familyId = task.family_id;

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
  if (patch.assigneeId !== undefined) {
    if (patch.assigneeId !== null) {
      const { rowCount } = await query('SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, patch.assigneeId]);
      if (!rowCount) throw badRequest('assignee is not a family member');
    }
    addSet('assignee_id', patch.assigneeId);
  }
  if (patch.dueDate !== undefined) {
    if (patch.dueDate !== null && !DATE_RE.test(patch.dueDate)) throw badRequest('dueDate must be YYYY-MM-DD');
    addSet('due_date', patch.dueDate);
  }

  if (!sets.length) return mapTask(task); // no-op patch

  const { rows } = await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  const updated = mapTask(rows[0]);
  await broadcastToFamily(familyId, { type: 'task', action: 'upsert', task: updated });
  return updated;
}

/** Flips done <-> open (setting/clearing done_by + done_at). */
export async function toggleTask({ id, userId }) {
  const task = await assertTaskAccess(id, userId);
  const done = !task.done;

  const { rows } = await query(
    done
      ? 'UPDATE tasks SET done = true, done_by = $2, done_at = now() WHERE id = $1 RETURNING *'
      : 'UPDATE tasks SET done = false, done_by = NULL, done_at = NULL WHERE id = $1 RETURNING *',
    done ? [id, userId] : [id],
  );

  const updated = mapTask(rows[0]);
  await broadcastToFamily(task.family_id, { type: 'task', action: 'upsert', task: updated });
  return updated;
}

export async function removeTask({ id, userId }) {
  const task = await assertTaskAccess(id, userId);
  await query('DELETE FROM tasks WHERE id = $1', [id]);
  await broadcastToFamily(task.family_id, { type: 'task', action: 'remove', ids: [id] });
  return { id };
}
