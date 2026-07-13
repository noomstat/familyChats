// Family Finance (#9): a family-wide shared ledger — expenses/split bills,
// settlements ("Settle up"), and one monthly budget per family. Same
// CRUD+realtime pattern as lists.js/events.js/albums.js: every function is
// membership-checked — the caller (actor) must be a member of the family
// that owns the row, or a fresh 404 for an unknown id / 403 for someone
// else's family's row.
//
// Read-vs-write asymmetry, same as lists.js: getFinance degrades to empty
// slices for a family-less user; addExpense/addTransfer/setBudget (which
// need somewhere to attach the new row) throw 409 'not in a family' instead.
//
// A receipt photo (if any) lives on disk in server/uploads/ (see uploads.js);
// an expense row's receipt_path is the public URL path ('/uploads/<uuid>.<ext>').
// Deleting an expense unlinks its receipt file — best-effort: a missing file
// is not an error, the row is the source of truth.
import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from './db.js';
import { broadcastToFamily } from './ws.js';
import { notifyUsers } from './notifications.js';
import { UPLOADS_DIR } from './uploads.js';

// Kept in sync with the client's built-in CATEGORIES (app/src/store/model.ts)
// — these five ids are always valid on an expense regardless of what a
// family's custom expense_categories table holds.
const BUILTIN_CATEGORY_IDS = new Set(['food', 'stay', 'trans', 'gear', 'refund']);
const MONTH_RE = /^\d{4}-\d{2}$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

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

async function isFamilyMember(familyId, userId) {
  const { rowCount } = await query('SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, userId]);
  return !!rowCount;
}

function mapExpense(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    label: row.label,
    categoryId: row.category_id,
    amount: Number(row.amount),
    paidBy: row.paid_by,
    splitAmong: row.split_among,
    receiptPath: row.receipt_path,
    createdBy: row.created_by,
    ts: row.ts.toISOString(),
  };
}

function mapTransfer(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    fromId: row.from_id,
    toId: row.to_id,
    amount: Number(row.amount),
    ts: row.ts.toISOString(),
  };
}

function mapBudget(row) {
  return { month: row.month, amount: Number(row.amount) };
}

function mapCategory(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    label: row.label,
    icon: row.icon,
    color: row.color,
    income: row.income,
    createdBy: row.created_by,
    ts: row.ts.toISOString(),
  };
}

/** Best-effort unlink of an uploaded file by its '/uploads/<name>' path. */
async function unlinkUpload(filePath) {
  const name = path.basename(filePath ?? '');
  if (!name) return;
  await fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
}

async function assertExpenseAccess(id, userId) {
  const { rows } = await query('SELECT * FROM expenses WHERE id = $1', [id]);
  const expense = rows[0];
  if (!expense) throw notFound('expense not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || expense.family_id !== familyId) throw forbidden('not a member of this family');
  return expense;
}

async function assertCategoryAccess(id, userId) {
  const { rows } = await query('SELECT * FROM expense_categories WHERE id = $1', [id]);
  const category = rows[0];
  if (!category) throw notFound('category not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || category.family_id !== familyId) throw forbidden('not a member of this family');
  return category;
}

/** True if `categoryId` is a built-in, or a custom category belonging to `familyId`. */
async function isValidCategory(categoryId, familyId) {
  if (BUILTIN_CATEGORY_IDS.has(categoryId)) return true;
  const { rowCount } = await query('SELECT 1 FROM expense_categories WHERE id = $1 AND family_id = $2', [categoryId, familyId]);
  return !!rowCount;
}

/** Current 'YYYY-MM' in server-local terms (matches the DB's to_char(now(), 'YYYY-MM') seed). */
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** My family's expenses + transfers + this month's budget (or null). Degrades to empty slices for a family-less user. */
export async function getFinance(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return { expenses: [], transfers: [], budget: null };

  const { rows: expenseRows } = await query('SELECT * FROM expenses WHERE family_id = $1 ORDER BY ts ASC', [familyId]);
  const { rows: transferRows } = await query('SELECT * FROM transfers WHERE family_id = $1 ORDER BY ts ASC', [familyId]);
  const { rows: budgetRows } = await query('SELECT * FROM budgets WHERE family_id = $1 AND month = $2', [familyId, currentMonth()]);

  return {
    expenses: expenseRows.map(mapExpense),
    transfers: transferRows.map(mapTransfer),
    budget: budgetRows[0] ? mapBudget(budgetRows[0]) : null,
  };
}

/** Insert an expense (idempotent on `id`). Payer + every splitter must be family members. `categoryId` must be a built-in or one of this family's custom categories. Broadcasts `expense`/`upsert` on a fresh insert. */
export async function addExpense({ id, label, categoryId, amount, paidBy, splitAmong, receiptPath, userId }) {
  if (!id) throw badRequest('id is required');
  if (typeof label !== 'string' || !label.trim()) throw badRequest('label is required');
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) throw badRequest('amount must be a positive number');
  if (!paidBy) throw badRequest('paidBy is required');
  if (!Array.isArray(splitAmong) || !splitAmong.length) throw badRequest('splitAmong must be a non-empty array');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');
  if (!(await isValidCategory(categoryId, familyId))) throw badRequest('invalid categoryId');

  const everyone = [...new Set([paidBy, ...splitAmong])];
  const { rows: memberRows } = await query(
    'SELECT user_id FROM family_members WHERE family_id = $1 AND user_id = ANY($2)',
    [familyId, everyone],
  );
  const valid = new Set(memberRows.map((r) => r.user_id));
  const invalid = everyone.filter((u) => !valid.has(u));
  if (invalid.length) throw badRequest(`not family members: ${invalid.join(', ')}`);

  const { rows } = await query(
    `INSERT INTO expenses (id, family_id, label, category_id, amount, paid_by, split_among, receipt_path, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, label.trim(), categoryId, numAmount, paidBy, splitAmong, receiptPath ?? null, userId],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM expenses WHERE id = $1', [id]);
    return existing[0] ? mapExpense(existing[0]) : null;
  }

  const expense = mapExpense(rows[0]);
  await broadcastToFamily(familyId, { type: 'expense', action: 'upsert', expense });
  return expense;
}

/** Deletes an expense and (best-effort) its receipt file on disk. */
export async function removeExpense({ id, userId }) {
  const expense = await assertExpenseAccess(id, userId);
  await query('DELETE FROM expenses WHERE id = $1', [id]);
  if (expense.receipt_path) await unlinkUpload(expense.receipt_path);
  await broadcastToFamily(expense.family_id, { type: 'expense', action: 'remove', id });
  return { id };
}

/** Insert a settlement (idempotent on `id`) — always from = the caller. `toId` must be a family member. Broadcasts `transfer`/`upsert` on a fresh insert. */
export async function addTransfer({ id, toId, amount, userId }) {
  if (!id) throw badRequest('id is required');
  if (!toId) throw badRequest('toId is required');
  if (toId === userId) throw badRequest('cannot settle up with yourself');
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) throw badRequest('amount must be a positive number');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');
  if (!(await isFamilyMember(familyId, toId))) throw badRequest('toId is not a family member');

  const { rows } = await query(
    `INSERT INTO transfers (id, family_id, from_id, to_id, amount)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, userId, toId, numAmount],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM transfers WHERE id = $1', [id]);
    return existing[0] ? mapTransfer(existing[0]) : null;
  }

  const transfer = mapTransfer(rows[0]);
  await broadcastToFamily(familyId, { type: 'transfer', action: 'upsert', transfer });
  return transfer;
}

/** Upsert the caller's family's budget for `month` (defaults to the current month). Broadcasts `budget`/`upsert`. */
export async function setBudget({ month, amount, userId }) {
  const targetMonth = month ?? currentMonth();
  if (!MONTH_RE.test(targetMonth)) throw badRequest('month must be YYYY-MM');
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) throw badRequest('amount must be a positive number');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  await query(
    `INSERT INTO budgets (family_id, month, amount) VALUES ($1, $2, $3)
     ON CONFLICT (family_id, month) DO UPDATE SET amount = EXCLUDED.amount`,
    [familyId, targetMonth, numAmount],
  );

  const budget = { month: targetMonth, amount: numAmount };
  await broadcastToFamily(familyId, { type: 'budget', action: 'upsert', budget });
  return budget;
}

/** Push a payment reminder to `toUserId` (must be a family member). No balance math here — the client computes what's owed. */
export async function remind({ toUserId, amount, userId }) {
  if (!toUserId) throw badRequest('toUserId is required');
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) throw badRequest('amount must be a positive number');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');
  if (!(await isFamilyMember(familyId, toUserId))) throw badRequest('toUserId is not a family member');

  const { rows: fromRows } = await query('SELECT name FROM users WHERE id = $1', [userId]);
  const fromName = fromRows[0]?.name ?? 'Someone';

  await notifyUsers({
    userIds: [toUserId],
    title: 'Payment reminder',
    body: `💸 ${fromName} — you owe ฿${numAmount.toLocaleString('en-US')}`,
    data: { type: 'finance' },
  });

  return { ok: true };
}

// ── Custom expense categories (Phase R) ───────────────────────
//
// The 5 built-ins (food/stay/trans/gear/refund) are client-side constants,
// never stored here — this table only holds what a family adds on top.
// Same read-vs-write asymmetry as the rest of this file: listCategories
// degrades to [] for a family-less user; addCategory throws 409 instead.

/** My family's custom categories. Degrades to [] for a family-less user. */
export async function listCategories(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];
  const { rows } = await query('SELECT * FROM expense_categories WHERE family_id = $1 ORDER BY ts ASC', [familyId]);
  return rows.map(mapCategory);
}

/** Insert a custom category (idempotent on `id`). Broadcasts `category`/`upsert` on a fresh insert. */
export async function addCategory({ id, label, icon, color, income, userId }) {
  if (!id) throw badRequest('id is required');
  if (typeof label !== 'string' || !label.trim()) throw badRequest('label is required');
  if (typeof icon !== 'string' || !icon.trim()) throw badRequest('icon is required');
  if (typeof color !== 'string' || !HEX_COLOR_RE.test(color)) throw badRequest('color must be a #RRGGBB hex string');
  if (BUILTIN_CATEGORY_IDS.has(id)) throw badRequest('id collides with a built-in category');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  const { rows } = await query(
    `INSERT INTO expense_categories (id, family_id, label, icon, color, income, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, label.trim(), icon.trim(), color, !!income, userId],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM expense_categories WHERE id = $1', [id]);
    return existing[0] ? mapCategory(existing[0]) : null;
  }

  const category = mapCategory(rows[0]);
  await broadcastToFamily(familyId, { type: 'category', action: 'upsert', category });
  return category;
}

/** Deletes a custom category. Past expenses keep their category id (they fall back to a neutral "Other" label client-side). */
export async function removeCategory({ id, userId }) {
  const category = await assertCategoryAccess(id, userId);
  await query('DELETE FROM expense_categories WHERE id = $1', [id]);
  await broadcastToFamily(category.family_id, { type: 'category', action: 'remove', id });
  return { id };
}
