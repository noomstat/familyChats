// FamilyChats domain model — types, seed data, and pure derivations.
// The store (AppStore.tsx) holds the mutable slices; everything here is either
// a static definition, seed data, or a pure function over store state.

export const CURRENT_USER = 'You Now';

// ─────────────────────────────────────────────────────────── Groups

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

export interface Message {
  id: string;
  author?: string;
  mine?: boolean;
  text?: string;
  live?: boolean;
  loc?: { label: string; meta: string };
  ts: number;
}

// A fixed reference point so seeded timestamps are deterministic (2026-07-05).
const SEED_DAY = Date.UTC(2026, 6, 5, 6, 0, 0);
const at = (h: number, m: number) => SEED_DAY + (h * 60 + m) * 60_000;

export const SEED_MESSAGES: Record<string, Message[]> = {
  trail: [
    { id: 't1', author: 'Mara', text: "who's actually coming today?", ts: at(14, 20) },
    { id: 't2', mine: true, text: 'me! leaving now', ts: at(14, 22) },
    { id: 't3', author: 'Dev', text: 'same, 10 min out', ts: at(14, 25) },
    { id: 't4', mine: true, loc: { label: 'The Fountain', meta: '0.4 mi · 6 min walk' }, text: 'meet here?', ts: at(14, 30) },
    { id: 't5', author: 'Mara', text: 'perfect 👌', ts: at(14, 32) },
  ],
  climb: [{ id: 'c1', author: 'Sam', loc: { label: 'Boulder Field', meta: '2.1 mi · trailhead lot' }, text: 'shared a location', ts: at(13, 10) }],
  dev: [{ id: 'd1', author: 'Dev', text: 'see you there', ts: at(10, 2) }],
  food: [{ id: 'f1', mine: true, text: 'booking a table', ts: at(9, 40) }],
  fam: [{ id: 'm1', author: 'Mom', text: 'call me when free', ts: at(8, 15) }],
};

export const SEED_UNREAD: Record<string, number> = { trail: 3, fam: 1 };
export const SEED_LIVE: Record<string, LiveShare | undefined> = {
  trail: { since: at(13, 34), expiresLabel: '58 min left' },
};

export interface LiveShare {
  since: number;
  expiresLabel: string;
}

/** One-line preview of a group's latest message for the chat list. */
export function previewOf(msgs: Message[] | undefined): string {
  if (!msgs || msgs.length === 0) return 'No messages yet';
  const m = msgs[msgs.length - 1];
  const who = m.mine ? 'You: ' : m.author ? `${m.author}: ` : '';
  if (m.loc) return `${who}📍 ${m.loc.label}`;
  return `${who}${m.text ?? ''}`.trim();
}

/** Clock label (HH:MM) for a timestamp; weekday if not today. */
const NOW_REF = new Date(Date.UTC(2026, 6, 5, 15, 0, 0));
export function timeLabel(ts: number): string {
  const d = new Date(ts);
  const sameDay = d.getUTCFullYear() === NOW_REF.getUTCFullYear() && d.getUTCMonth() === NOW_REF.getUTCMonth() && d.getUTCDate() === NOW_REF.getUTCDate();
  if (sameDay) return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
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
