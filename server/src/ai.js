// AI: Chat Summary (#7) + AI Search (#8), via the Claude API. Every public
// function is membership/family-scoped like the rest of the app — the
// membership check always runs first (works with no key at all), and only
// once access is confirmed do we reach for the Anthropic client. That way a
// non-member gets a normal 403 even when ANTHROPIC_API_KEY is unset, and a
// member gets a clean 503 with a clear message instead of a stack trace.
import fs from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { query } from './db.js';
import { UPLOADS_DIR } from './uploads.js';

// Haiku-class model: cheap/fast, plenty for a catch-up summary, keyword
// extraction + short synthesized answer, or a receipt-scan vision call. See
// the claude-api skill's model table — this is the current Haiku alias, not
// guessed.
const MODEL = 'claude-haiku-4-5';
const SUMMARY_MESSAGE_LIMIT = 100;
const HIT_LIMIT = 40;
const RECEIPT_CATEGORY_IDS = new Set(['food', 'stay', 'trans', 'gear', 'refund']);
const IMAGE_MEDIA_TYPE = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

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

function unavailable(message) {
  const err = new Error(message);
  err.status = 503;
  return err;
}

// Lazy singleton — constructed on first use so a missing key doesn't crash
// the process at import time (module load happens even if AI is never called).
let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw unavailable('AI is not configured (ANTHROPIC_API_KEY missing)');
  client = new Anthropic({ apiKey });
  return client;
}

async function userFamilyId(userId) {
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

async function groupMeta(groupId) {
  const { rows } = await query('SELECT id, family_id, name FROM groups WHERE id = $1', [groupId]);
  return rows[0] ?? null;
}

/** Same shape as chat.js's assertMember — loads the group and asserts `userId` is one of its members. Throws 404/403. */
async function assertMember(groupId, userId) {
  const group = await groupMeta(groupId);
  if (!group) throw notFound('group not found');
  const { rowCount } = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  if (!rowCount) throw forbidden('not a member of this group');
  return group;
}

function firstText(response) {
  const block = response.content.find((b) => b.type === 'text');
  return block?.text?.trim() ?? '';
}

// ── Chat Summary (#7) ────────────────────────────────────────

/**
 * Last ~100 messages of a group, rendered as `Name: text` lines, summarized
 * by Claude into 4-6 short catch-up bullets. Membership-checked before the
 * key check, so a non-member gets 403 even with no key configured.
 */
export async function summarizeGroup(groupId, userId) {
  await assertMember(groupId, userId);
  const anthropic = getClient();

  const { rows } = await query(
    `SELECT m.kind, m.body, m.loc, u.name AS author_name
     FROM messages m
     JOIN users u ON u.id = m.author_id
     WHERE m.group_id = $1
     ORDER BY m.ts ASC
     LIMIT $2`,
    [groupId, SUMMARY_MESSAGE_LIMIT],
  );

  if (!rows.length) {
    return { summary: 'No messages yet in this chat.', messageCount: 0 };
  }

  const lines = rows.map((r) => {
    if (r.kind === 'loc') return `${r.author_name}: 📍 shared ${r.loc?.label ?? 'a location'}`;
    if (r.kind === 'voice') return `${r.author_name}: 🎤 voice message`;
    return `${r.author_name}: ${r.body ?? ''}`;
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system:
      'You are a concise family-chat catch-up assistant. You will be given a chat transcript as `Name: text` lines. ' +
      'Summarize it in 4-6 short bullet points so someone who missed the conversation can catch up fast. ' +
      "Format: plain text bullets starting with '- ', no preamble, no headers, no markdown besides the bullets. " +
      'Keep people\'s names. Call out any decisions made, plans, and anything that seems to need a reply or action from "me" specifically.',
    messages: [{ role: 'user', content: lines.join('\n') }],
  });

  const summary = firstText(response) || 'Nothing notable to summarize.';
  return { summary, messageCount: rows.length };
}

// ── AI Search (#8) ───────────────────────────────────────────

const KEYWORD_SYSTEM =
  'Extract 3 to 8 short search keywords or phrases (Thai or English, whichever the query uses) from the ' +
  "user's natural-language question. They will be used for a simple substring (ILIKE) search across a family's " +
  'chat messages, tasks, events, grocery list, and photo captions — so prefer concrete nouns/phrases likely to ' +
  'appear verbatim in those records, not a restatement of the whole question. ' +
  'Respond with ONLY a JSON array of strings, nothing else. Example: ["milk", "eggs", "cabin"]';

/** Best-effort keyword extraction: strict-JSON parse of Claude's array, with a naive whitespace-split fallback. */
async function extractKeywords(anthropic, userQuery) {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: KEYWORD_SYSTEM,
      messages: [{ role: 'user', content: userQuery }],
    });
    const raw = firstText(response);
    const match = raw.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim());
      if (cleaned.length) return cleaned.slice(0, 8);
    }
  } catch {
    // fall through to the naive split below
  }
  return userQuery.split(/\s+/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
}

/** Builds `(col1 ILIKE $n OR col2 ILIKE $n OR ...)` OR'd across every keyword, pushing one `%kw%` param per keyword onto `params`. */
function ilikeAny(columns, keywords, params) {
  const perKeyword = keywords.map((kw) => {
    params.push(`%${kw}%`);
    const idx = params.length;
    return `(${columns.map((c) => `${c} ILIKE $${idx}`).join(' OR ')})`;
  });
  return perKeyword.length ? `(${perKeyword.join(' OR ')})` : 'FALSE';
}

/**
 * Retrieval layer, exported separately so it can be tested without touching
 * Claude: ILIKE search for `keywords` across the caller's family's messages,
 * tasks, events, grocery items, photos, and albums. Family-scoped throughout
 * — messages via a join through groups (which carry family_id), everything
 * else via its own family_id column. Returns typed hits, newest first,
 * capped at ~40 total. Degrades to [] for a family-less user or an empty
 * keyword list (same read-vs-write asymmetry as lists.js/events.js).
 */
export async function retrieveHits(keywords, userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];

  const kws = (keywords ?? []).map((k) => String(k).trim()).filter(Boolean).slice(0, 8);
  if (!kws.length) return [];

  const hits = [];

  {
    const params = [familyId];
    const cond = ilikeAny(['m.body'], kws, params);
    const { rows } = await query(
      `SELECT m.id, m.group_id, m.kind, m.body, m.loc, m.ts, g.name AS group_name
       FROM messages m JOIN groups g ON g.id = m.group_id
       WHERE g.family_id = $1 AND ${cond}
       ORDER BY m.ts DESC LIMIT ${HIT_LIMIT}`,
      params,
    );
    for (const r of rows) {
      let label;
      if (r.kind === 'loc') label = `📍 ${r.loc?.label ?? 'shared a location'}`;
      else if (r.kind === 'voice') label = '🎤 voice message';
      else label = (r.body ?? '').slice(0, 60);
      hits.push({ type: 'message', id: r.id, label, snippet: r.group_name, ts: r.ts.toISOString(), groupId: r.group_id });
    }
  }

  {
    const params = [familyId];
    const cond = ilikeAny(['title', 'notes'], kws, params);
    const { rows } = await query(
      `SELECT id, title, notes, ts FROM tasks WHERE family_id = $1 AND ${cond} ORDER BY ts DESC LIMIT ${HIT_LIMIT}`,
      params,
    );
    for (const r of rows) {
      hits.push({ type: 'task', id: r.id, label: r.title, snippet: r.notes ?? '', ts: r.ts.toISOString() });
    }
  }

  {
    const params = [familyId];
    const cond = ilikeAny(['title', 'notes'], kws, params);
    const { rows } = await query(
      `SELECT id, title, notes, ts FROM events WHERE family_id = $1 AND ${cond} ORDER BY ts DESC LIMIT ${HIT_LIMIT}`,
      params,
    );
    for (const r of rows) {
      hits.push({ type: 'event', id: r.id, label: r.title, snippet: r.notes ?? '', ts: r.ts.toISOString() });
    }
  }

  {
    const params = [familyId];
    const cond = ilikeAny(['label'], kws, params);
    const { rows } = await query(
      `SELECT id, label, qty, ts FROM grocery_items WHERE family_id = $1 AND ${cond} ORDER BY ts DESC LIMIT ${HIT_LIMIT}`,
      params,
    );
    for (const r of rows) {
      hits.push({ type: 'grocery', id: r.id, label: r.label, snippet: r.qty ? `Qty: ${r.qty}` : '', ts: r.ts.toISOString() });
    }
  }

  {
    const params = [familyId];
    const cond = ilikeAny(['p.caption'], kws, params);
    const { rows } = await query(
      `SELECT p.id, p.caption, p.ts, a.name AS album_name
       FROM photos p JOIN albums a ON a.id = p.album_id
       WHERE p.family_id = $1 AND ${cond}
       ORDER BY p.ts DESC LIMIT ${HIT_LIMIT}`,
      params,
    );
    for (const r of rows) {
      hits.push({ type: 'photo', id: r.id, label: (r.caption ?? 'Photo').slice(0, 60), snippet: r.album_name, ts: r.ts.toISOString() });
    }
  }

  {
    const params = [familyId];
    const cond = ilikeAny(['name'], kws, params);
    const { rows } = await query(
      `SELECT id, name, ts FROM albums WHERE family_id = $1 AND ${cond} ORDER BY ts DESC LIMIT ${HIT_LIMIT}`,
      params,
    );
    for (const r of rows) {
      hits.push({ type: 'album', id: r.id, label: r.name, snippet: '', ts: r.ts.toISOString() });
    }
  }

  hits.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return hits.slice(0, HIT_LIMIT);
}

const ANSWER_SYSTEM =
  "Answer the family member's question using ONLY the numbered context items below — don't use outside knowledge. " +
  'Be concise (a couple of sentences, or a short list). Cite the items you rely on like [1], [2]. ' +
  'If none of the context is actually relevant to the question, say exactly: "I couldn\'t find anything about that."';

/**
 * Two-step search: Claude extracts keywords from the natural-language
 * `queryText` (call #1), `retrieveHits` runs the ILIKE search, then — only if
 * there are hits — Claude synthesizes an answer citing them (call #2). Zero
 * hits short-circuits straight to the not-found answer, skipping call #2.
 */
export async function searchFamily(queryText, userId) {
  if (typeof queryText !== 'string' || !queryText.trim()) throw badRequest('query is required');
  const trimmed = queryText.trim();
  const anthropic = getClient();

  const keywords = await extractKeywords(anthropic, trimmed);
  const hits = await retrieveHits(keywords, userId);

  if (!hits.length) {
    return { answer: "I couldn't find anything about that.", hits: [] };
  }

  const context = hits.map((h, i) => `[${i + 1}] (${h.type}) ${h.label}${h.snippet ? ` — ${h.snippet}` : ''}`).join('\n');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: ANSWER_SYSTEM,
    messages: [{ role: 'user', content: `Question: ${trimmed}\n\nContext:\n${context}` }],
  });

  const answer = firstText(response) || "I couldn't find anything about that.";
  return { answer, hits };
}

// ── Receipt Scan (#9, Family Finance) ─────────────────────────

const RECEIPT_SYSTEM =
  'You are a receipt-scanning assistant for a family finance app. Look at the receipt photo and extract its data. ' +
  'Respond with ONLY a single JSON object, nothing else — no markdown fences, no commentary. Shape: ' +
  '{"merchant": string|null, "total": number|null, "currency": string|null, "date": string|null, ' +
  '"items": [{"label": string, "amount": number}], "suggestedCategory": one of "food","stay","trans","gear","refund"}. ' +
  'Use null for any field you cannot read. "total" and item "amount"s are plain numbers (no currency symbols). ' +
  '"date" is an ISO 8601 date (YYYY-MM-DD) if you can read one, else null. ' +
  '"suggestedCategory" is your best guess at which of the five categories this receipt belongs to (food & drink, ' +
  'lodging/stays, transport, gear/shopping, or refund) — default to "food" if genuinely unclear.';

/** Best-effort parse of Claude's receipt JSON: strips markdown fences, defaults missing/invalid fields. */
function parseReceiptScan(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((it) => it && typeof it.label === 'string')
        .map((it) => ({ label: it.label, amount: Number.isFinite(Number(it.amount)) ? Number(it.amount) : 0 }))
    : [];
  return {
    merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
    total: Number.isFinite(Number(parsed.total)) ? Number(parsed.total) : null,
    currency: typeof parsed.currency === 'string' ? parsed.currency : null,
    date: typeof parsed.date === 'string' ? parsed.date : null,
    items,
    suggestedCategory: RECEIPT_CATEGORY_IDS.has(parsed.suggestedCategory) ? parsed.suggestedCategory : 'food',
  };
}

/**
 * Reads an already-uploaded receipt image from UPLOADS_DIR and asks Claude
 * vision to extract merchant/total/date/items/category. Membership is NOT
 * checked here (see server.js's /finance/scan-receipt route — the upload
 * itself is family-scoped via addExpense's family membership, and the scan
 * is best-effort on top of an already-stored file); a missing/misconfigured
 * key surfaces as a clean 503 so the route can degrade to manual entry with
 * the photo attached (same UX as Phase G's chat summary/search).
 */
export async function scanReceipt(filePath) {
  const anthropic = getClient();

  const name = path.basename(filePath ?? '');
  const ext = path.extname(name).toLowerCase();
  const mediaType = IMAGE_MEDIA_TYPE[ext];
  if (!name || !mediaType) throw badRequest('receipt file must be an image (jpg/png/webp/gif)');

  const bytes = await fs.readFile(path.join(UPLOADS_DIR, name));
  const base64 = bytes.toString('base64');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: RECEIPT_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Extract this receipt as JSON.' },
        ],
      },
    ],
  });

  const raw = firstText(response);
  try {
    return parseReceiptScan(raw);
  } catch {
    // Model didn't return parseable JSON — degrade to an empty-but-valid shape
    // rather than failing the whole upload.
    return { merchant: null, total: null, currency: null, date: null, items: [], suggestedCategory: 'food' };
  }
}
