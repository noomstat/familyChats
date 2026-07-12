// FamilyChats domain model — types, seed data, and pure derivations.
// The store (AppStore.tsx) holds the mutable slices; everything here is either
// a static definition, seed data, or a pure function over store state.
import type { ServerExpense, ServerTransfer } from '../api/client';

// ─────────────────────────────────────────────────────────── Messages
//
// A group chat message. Server-backed (see ServerMessage in api/client.ts) —
// `mine` is deliberately NOT stored here; derive it at render time as
// `message.authorId === session.userId`.

export interface Message {
  id: string;
  groupId: string;
  authorId: string;
  /** Best-effort display name, resolved from family members when known. */
  authorName?: string;
  kind: 'text' | 'loc' | 'voice';
  text?: string;
  live?: boolean;
  loc?: { label: string; meta?: string };
  /** Voice messages only: '/uploads/<name>' once uploaded, or a local file:/blob:/data: uri
   * right after recording (before the upload round-trip replaces it with the server path). */
  mediaPath?: string;
  /** Voice messages only: clip length in ms. */
  durationMs?: number;
  /** True when this message's body is an E2EE envelope we couldn't decrypt
   * (no family key yet, or the wrong one). `text`/`loc` are left undefined —
   * the thread renders a locked bubble instead of the raw ciphertext. */
  locked?: boolean;
  ts: number;
}

export interface LiveShare {
  since: number;
  expiresLabel: string;
}

/** Clock label (HH:MM) for a timestamp; weekday if not today (real wall clock). */
export function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

// ─────────────────────────────────────────────────────────── Family Finance
//
// Server-backed, family-wide shared ledger (see ServerExpense/ServerTransfer/
// ServerBudget in api/client.ts) — `paidBy`/`splitAmong`/transfer parties are
// user ids, resolved to display names at render time via family members
// (same pattern as ThreadScreen's `nameOf`).

export type CategoryId = 'food' | 'stay' | 'trans' | 'gear' | 'refund';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
  /** Income (money coming back) rather than a spend. */
  income?: boolean;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'food', label: 'Food & drink', icon: 'utensils', color: '#FF5A3C' },
  { id: 'stay', label: 'Stays', icon: 'bed-double', color: '#FF7657' },
  { id: 'trans', label: 'Transport', icon: 'car', color: '#F5A623' },
  { id: 'gear', label: 'Gear', icon: 'backpack', color: '#2E72E8' },
  { id: 'refund', label: 'Refunds & paid back', icon: 'corner-down-left', color: '#12B76A', income: true },
];

export const categoryMeta = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
export const SPEND_CATEGORIES = CATEGORIES.filter((c) => !c.income);

/** Thai Baht formatter — `฿35,000` (thousands-separated, no decimals when whole, else 2dp). */
export function thb(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const isWhole = Math.abs(abs - Math.round(abs)) < 0.005;
  const formatted = isWhole
    ? Math.round(abs).toLocaleString('en-US')
    : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}฿${formatted}`;
}

/** 'YYYY-MM' for a given date (local time), defaulting to now — matches the server's budget `month` key. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export interface FinCategoryTotal {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
  amount: number;
}

export interface FinPersonBalance {
  userId: string;
  paid: number;
  share: number;
  /** + owed to them, − they owe. */
  net: number;
}

export interface FinanceSummary {
  spendByCategory: FinCategoryTotal[];
  income: { label: string; icon: string; amount: number };
  expenseTotal: number;
  incomeTotal: number;
  /** Sorted by net descending (biggest creditor first, biggest debtor last). */
  people: FinPersonBalance[];
}

/**
 * Roll a family's expenses + transfers into category totals and per-person
 * balances. Id-keyed port of the old (pre-Phase-I) display-name-keyed
 * `summarize()` — `memberIds` ensures every current family member gets a row
 * even if they've never paid or split anything yet.
 */
export function summarizeFinance(expenses: ServerExpense[], transfers: ServerTransfer[], memberIds: string[]): FinanceSummary {
  const spend = expenses.filter((e) => !categoryMeta(e.categoryId).income);
  const refunds = expenses.filter((e) => categoryMeta(e.categoryId).income);

  const spendByCategory: FinCategoryTotal[] = SPEND_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    color: c.color,
    amount: spend.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.amount > 0);

  const expenseTotal = spend.reduce((s, e) => s + e.amount, 0);
  const incomeTotal = refunds.reduce((s, e) => s + e.amount, 0);

  // Membership across all expenses (union of splits + payers) + every current member.
  const ids = new Set<string>();
  expenses.forEach((e) => {
    ids.add(e.paidBy);
    e.splitAmong.forEach((id) => ids.add(id));
  });
  memberIds.forEach((id) => ids.add(id));

  const people: FinPersonBalance[] = [...ids].map((userId) => {
    const paid = spend.filter((e) => e.paidBy === userId).reduce((s, e) => s + e.amount, 0);
    const share = spend
      .filter((e) => e.splitAmong.includes(userId))
      .reduce((s, e) => s + e.amount / e.splitAmong.length, 0);
    const out = transfers.filter((t) => t.fromId === userId).reduce((s, t) => s + t.amount, 0);
    const inc = transfers.filter((t) => t.toId === userId).reduce((s, t) => s + t.amount, 0);
    return { userId, paid, share, net: paid - share + out - inc };
  });
  people.sort((a, b) => b.net - a.net);

  const refundMeta = categoryMeta('refund');
  return {
    spendByCategory,
    income: { label: refundMeta.label, icon: refundMeta.icon, amount: incomeTotal },
    expenseTotal,
    incomeTotal,
    people,
  };
}
