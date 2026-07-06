// FamilyChats domain model — types, seed data, and pure derivations.
// The store (AppStore.tsx) holds the mutable slices; everything here is either
// a static definition, seed data, or a pure function over store state.

export const CURRENT_USER = 'You Now';

// ─────────────────────────────────────────────────────────── Groups
//
// NOTE: as of Phase B, real chat groups are server-backed and dynamic (see
// `ChatGroup` in AppStore.tsx, fed by GET /bootstrap). This static roster is
// now used ONLY by the local-only Expenses feature (ledger math keyed by
// display name) — do not wire it back into chat state.

export interface Group {
  id: string;
  name: string;
  /** Group size; null for a 1:1 DM. */
  members: number | null;
  roster: string[];
}

export const GROUPS: Group[] = [
  { id: 'trail', name: 'Trail Crew', members: 6, roster: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'] },
  { id: 'climb', name: 'Weekend Climb', members: 4, roster: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'] },
  { id: 'dev', name: 'Dev Kaur', members: null, roster: ['You Now', 'Dev Kaur'] },
  { id: 'food', name: 'Taco Tuesday', members: 5, roster: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'] },
  { id: 'fam', name: 'Family', members: 4, roster: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'] },
];

export const groupById = (id: string) => GROUPS.find((g) => g.id === id);

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
  ts: number;
}

// A fixed reference point so seeded expense timestamps are deterministic
// (2026-07-05). Chat no longer uses this — messages carry real server ts.
const SEED_DAY = Date.UTC(2026, 6, 5, 6, 0, 0);
const at = (h: number, m: number) => SEED_DAY + (h * 60 + m) * 60_000;

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

// ─────────────────────────────────────────────────────────── Expenses ledger

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

export interface Expense {
  id: string;
  groupId: string;
  label: string;
  categoryId: CategoryId;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  ts: number;
}

/** A settlement payment from one member to another (used by "Settle up"). */
export interface Transfer {
  id: string;
  groupId: string;
  from: string;
  to: string;
  amount: number;
  ts: number;
}

export const SEED_EXPENSES: Expense[] = [
  { id: 'e1', groupId: 'trail', label: 'Trailhead Diner', categoryId: 'food', amount: 128.4, paidBy: 'You Now', splitAmong: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'], ts: at(14, 52) },
  { id: 'e2', groupId: 'trail', label: 'Cabin night', categoryId: 'stay', amount: 220.0, paidBy: 'Mara Ito', splitAmong: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'], ts: at(12, 5) },
  { id: 'e3', groupId: 'trail', label: 'Petrol', categoryId: 'trans', amount: 84.0, paidBy: 'Dev Kaur', splitAmong: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'], ts: at(9, 30) },
  { id: 'e4', groupId: 'trail', label: 'Climbing gear', categoryId: 'gear', amount: 40.0, paidBy: 'You Now', splitAmong: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'], ts: at(8, 10) },
  { id: 'e5', groupId: 'trail', label: 'Coffee run', categoryId: 'food', amount: 36.0, paidBy: 'You Now', splitAmong: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'], ts: at(13, 15) },
  { id: 'e6', groupId: 'trail', label: 'Deposit returned', categoryId: 'refund', amount: 80.0, paidBy: 'Mara Ito', splitAmong: ['You Now', 'Mara Ito', 'Dev Kaur', 'Sam Ng'], ts: at(15, 0) },
];

export const SEED_TRANSFERS: Transfer[] = [];

/** FamilyChats settled on Thai Baht mid-design (see chats/chat1.md). */
export const money = (n: number) => (n < 0 ? '-' : '') + 'THB ' + Math.abs(n).toFixed(2);

// ── Derivations (pure) ──────────────────────────────────────

export interface CategoryTotal {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
  amount: number;
}

export interface PersonBalance {
  name: string;
  paid: number;
  share: number;
  net: number; // + owed to them, − they owe
}

export interface LedgerSummary {
  spendByCategory: CategoryTotal[];
  income: { label: string; icon: string; amount: number };
  expenseTotal: number;
  incomeTotal: number;
  people: PersonBalance[];
  you: PersonBalance;
}

/** Roll a group's expenses + transfers into category totals and per-person balances. */
export function summarize(groupId: string, expenses: Expense[], transfers: Transfer[]): LedgerSummary {
  const rows = expenses.filter((e) => e.groupId === groupId);
  const xfers = transfers.filter((t) => t.groupId === groupId);
  const spend = rows.filter((e) => !categoryMeta(e.categoryId).income);
  const refunds = rows.filter((e) => categoryMeta(e.categoryId).income);

  const spendByCategory: CategoryTotal[] = SPEND_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    color: c.color,
    amount: spend.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.amount > 0);

  const expenseTotal = spend.reduce((s, e) => s + e.amount, 0);
  const incomeTotal = refunds.reduce((s, e) => s + e.amount, 0);

  // Membership across all expenses in this group (union of splits + payers).
  const names = new Set<string>();
  rows.forEach((e) => { names.add(e.paidBy); e.splitAmong.forEach((n) => names.add(n)); });
  const roster = groupById(groupId)?.roster ?? [];
  roster.forEach((n) => names.add(n));

  const people: PersonBalance[] = [...names].map((name) => {
    const paid = spend.filter((e) => e.paidBy === name).reduce((s, e) => s + e.amount, 0);
    const share = spend
      .filter((e) => e.splitAmong.includes(name))
      .reduce((s, e) => s + e.amount / e.splitAmong.length, 0);
    const out = xfers.filter((t) => t.from === name).reduce((s, t) => s + t.amount, 0);
    const inc = xfers.filter((t) => t.to === name).reduce((s, t) => s + t.amount, 0);
    return { name, paid, share, net: paid - share + out - inc };
  });
  // Current user first, then largest creditor → debtor.
  people.sort((a, b) => (a.name === CURRENT_USER ? -1 : b.name === CURRENT_USER ? 1 : b.net - a.net));

  const you = people.find((p) => p.name === CURRENT_USER) ?? { name: CURRENT_USER, paid: 0, share: 0, net: 0 };
  const refundMeta = categoryMeta('refund');
  return {
    spendByCategory,
    income: { label: refundMeta.label, icon: refundMeta.icon, amount: incomeTotal },
    expenseTotal,
    incomeTotal,
    people,
    you,
  };
}

// Static receipt used by the shareable-receipt sheet (detail of expense e1).
export const RECEIPT = {
  merchant: 'Trailhead Diner',
  date: 'SAT 14:52',
  paidBy: 'You',
  category: 'Food & drink',
  items: [
    ['Big breakfast x4', 52.0],
    ['Cold brew x4', 18.0],
    ['Trail sandwiches x6', 42.0],
    ['Tax & tip', 16.4],
  ] as [string, number][],
  total: 128.4,
};
