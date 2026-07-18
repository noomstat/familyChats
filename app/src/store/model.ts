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
  kind: 'text' | 'loc' | 'voice' | 'file';
  text?: string;
  live?: boolean;
  loc?: { label: string; meta?: string };
  /** Voice/file messages only: '/uploads/<name>' once uploaded, or a local file:/blob:/data: uri
   * right after recording/picking (before the upload round-trip replaces it with the server path).
   * For `kind: 'file'`, this is the ENCRYPTED blob path — never render/play it directly; decrypt
   * first (see EncryptedImage / the file-chip tap handler in FriendThreadScreen). */
  mediaPath?: string;
  /** Voice messages only: clip length in ms. */
  durationMs?: number;
  /** `kind: 'file'` only — the metadata decrypted out of `body` (filename/mime/size/nonce never
   * ride in plaintext). Metadata-only: the actual bytes are fetched/decrypted lazily by the
   * rendering bubble, not here. Undefined for a locked (undecryptable) file message. */
  file?: { name: string; mime: string; size: number; nonce: string; w?: number; h?: number };
  /** True when this message's body is an E2EE envelope we couldn't decrypt
   * (no family key yet, or the wrong one). `text`/`loc` are left undefined —
   * the thread renders a locked bubble instead of the raw ciphertext. */
  locked?: boolean;
  /** Phase L — set whenever the wire body was an E2EE envelope (`e2e:1:…`),
   * regardless of whether it decrypted successfully. This is the ONLY form
   * of an encrypted message the persist layer is allowed to write to disk —
   * see AppStore.tsx's persist effect, which strips `text`/`loc`/`live` from
   * any message holding a `cipher` before it ever reaches AsyncStorage/
   * localStorage. Also what the REDECRYPT reducer action re-maps through
   * decryptPayload once a family key becomes available. */
  cipher?: string;
  ts: number;
}

export interface LiveShare {
  since: number;
  expiresLabel: string;
}

// ─────────────────────────────────────────────────────────── Notes
//
// A shared family note (Phase P — E2EE). Server-backed (see ServerNote in
// api/client.ts) — mirrors Message's cipher/locked pattern: `title`/`body`
// are the decrypted view (present once we hold the family key and the
// envelope checks out), `cipher` is the raw e2e:1: envelope (kept around so
// a later REDECRYPT pass can retry once a key loads), and `locked` means we
// tried to decrypt and failed (no key yet, wrong key, or tamper).

export interface Note {
  id: string;
  familyId: string;
  title?: string;
  body?: string;
  /** Phase P — set whenever the wire cipher was an E2EE envelope, regardless
   * of whether it decrypted successfully. This is the ONLY form of an
   * encrypted note the persist layer is allowed to write to disk — see
   * AppStore.tsx's persist effect, which strips `title`/`body` from any note
   * holding a `cipher` before it ever reaches AsyncStorage/localStorage. Also
   * what the REDECRYPT reducer action re-maps through decryptPayloadWithKeys
   * once a family key becomes available. */
  cipher: string;
  /** True when this note's cipher is an E2EE envelope we couldn't decrypt
   * (no family key yet, or the wrong one). `title`/`body` are left undefined
   * — the UI renders a locked card instead of the raw ciphertext. */
  locked?: boolean;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  updatedAt: string;
  /** ISO 8601 timestamp. */
  ts: string;
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

/** The 5 always-available built-in category ids. Families can add more on top (see ServerCategory in api/client.ts) — an expense's `categoryId` is a plain string that may be one of these OR a custom (server) category's id. */
export type CategoryId = 'food' | 'stay' | 'trans' | 'gear' | 'refund';

export interface CategoryMeta {
  /** A built-in id, a custom (server) category id, or the resolveCategory() fallback's synthetic id. */
  id: string;
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

/** Built-in-only lookup (throws via `!` for an unknown id) — safe wherever `id` is statically known to be one of the 5 built-ins. Prefer resolveCategory() for any id that could be a custom category or a deleted one. */
export const categoryMeta = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
export const SPEND_CATEGORIES = CATEGORIES.filter((c) => !c.income);

/** Neutral fallback for an expense's categoryId that resolves to neither a built-in nor a currently-known custom category — e.g. a custom category that's since been deleted (deletion doesn't rewrite past expenses; see finance.js's removeCategory). */
export const FALLBACK_CATEGORY: CategoryMeta = { id: 'other', label: 'Other', icon: 'tag', color: '#9AA5B1', income: false };

/**
 * Resolve any category id (built-in or custom) against the merged set: the 5
 * built-ins always win first, then `custom` (a family's server-backed
 * expense_categories — pass useCategories()'s custom slice, or the merged
 * list itself, either works since built-ins are checked first regardless),
 * falling back to a neutral "Other" for an unknown/deleted id.
 */
export function resolveCategory(id: string, custom: CategoryMeta[] = []): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? custom.find((c) => c.id === id) ?? FALLBACK_CATEGORY;
}

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
  id: string;
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

/** Phase R — one family member's income vs expense totals (see FinanceSummary.memberBreakdown). */
export interface FinMemberBreakdown {
  userId: string;
  /** Their share of spend-category expenses: sum over expenses where they're in splitAmong, amount/splitAmong.length. Shares across all members sum to `familyBreakdown.expense`. */
  expense: number;
  /** Income-category amounts they paid (paidBy). Sums across all members to `familyBreakdown.income`. */
  income: number;
}

/** Phase R — the whole family's aggregate income vs expense (see FinanceSummary.familyBreakdown). */
export interface FinFamilyBreakdown {
  /** Total of all spend-category expenses — equals the sum of every member's `expense` share. */
  expense: number;
  /** Total of all income-category expenses — equals the sum of every member's `income`. */
  income: number;
}

export interface FinanceSummary {
  spendByCategory: FinCategoryTotal[];
  income: { label: string; icon: string; amount: number };
  expenseTotal: number;
  incomeTotal: number;
  /** Sorted by net descending (biggest creditor first, biggest debtor last). */
  people: FinPersonBalance[];
  /** Phase R — per-member income vs expense, one row per member (same membership rule as `people`). */
  memberBreakdown: FinMemberBreakdown[];
  /** Phase R — the family-wide aggregate (== expenseTotal/incomeTotal, named for the Breakdown UI). */
  familyBreakdown: FinFamilyBreakdown;
}

/**
 * Roll a family's expenses + transfers into category totals and per-person
 * balances. Id-keyed port of the old (pre-Phase-I) display-name-keyed
 * `summarize()` — `memberIds` ensures every current family member gets a row
 * even if they've never paid or split anything yet.
 *
 * `customCategories` is a family's server-backed custom categories (just the
 * custom ones — resolveCategory() already checks the 5 built-ins first
 * regardless of what's passed here), used to resolve each expense's
 * categoryId to its label/icon/color/income-ness. An expense whose category
 * was since deleted (or belongs to neither list) falls back to a neutral
 * "Other" bucket via resolveCategory — it still counts toward totals, just
 * displayed generically.
 */
export function summarizeFinance(
  expenses: ServerExpense[],
  transfers: ServerTransfer[],
  memberIds: string[],
  customCategories: CategoryMeta[] = [],
): FinanceSummary {
  const catOf = (id: string) => resolveCategory(id, customCategories);
  const spend = expenses.filter((e) => !catOf(e.categoryId).income);
  const refunds = expenses.filter((e) => catOf(e.categoryId).income);

  const spendCatIds = [...new Set(spend.map((e) => e.categoryId))];
  const spendByCategory: FinCategoryTotal[] = spendCatIds
    .map((id) => {
      const meta = catOf(id);
      return {
        id,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        amount: spend.filter((e) => e.categoryId === id).reduce((s, e) => s + e.amount, 0),
      };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

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

  const memberBreakdown: FinMemberBreakdown[] = [...ids].map((userId) => ({
    userId,
    expense: spend
      .filter((e) => e.splitAmong.includes(userId))
      .reduce((s, e) => s + e.amount / e.splitAmong.length, 0),
    income: refunds.filter((e) => e.paidBy === userId).reduce((s, e) => s + e.amount, 0),
  }));

  const familyBreakdown: FinFamilyBreakdown = { expense: expenseTotal, income: incomeTotal };

  return {
    spendByCategory,
    income: { label: 'Income', icon: 'corner-down-left', amount: incomeTotal },
    expenseTotal,
    incomeTotal,
    people,
    memberBreakdown,
    familyBreakdown,
  };
}
