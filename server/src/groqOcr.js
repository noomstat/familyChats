// Receipt OCR via Groq (OpenAI-compatible vision API). Config is read from
// the environment (server/.env), never hardcoded:
//   GROQ_API_KEY   — required; without it scanReceipt throws (503) and the
//                    caller degrades to "photo stored, no auto-fill".
//   GROQ_MODEL     — a Groq VISION model id, e.g.
//                    meta-llama/llama-4-scout-17b-16e-instruct
//   GROQ_BASE_URL  — optional; defaults to Groq's public endpoint.
//
// The server sends the receipt image (as a base64 data URL) to the model and
// asks for a strict JSON object; nothing is stored by Groq beyond the request.
import fs from 'node:fs/promises';

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';

function unavailable(message) {
  const err = new Error(message);
  err.status = 503;
  return err;
}

const PROMPT =
  'You are a receipt OCR extractor. Read this receipt image and return a JSON object with exactly these keys: ' +
  '"merchant" (the store/business name, string), "total" (the grand total as a number with no currency symbol), ' +
  '"currency" (ISO 4217 code like "THB" or "USD"), and "date" ("YYYY-MM-DD"). ' +
  'Use null for any field that is not clearly visible. Respond with ONLY the JSON object, no prose.';

/** Coerce the model's total into a positive number, or null. Handles "1,234.50", "฿1234", "1234.5". */
function parseTotal(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v > 0 ? v : null;
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[^0-9.]/g, ''); // strip currency symbols, spaces, thousands separators
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * OCR a receipt image on disk. Returns `{ merchant, total, currency, date }`
 * (any field may be null). Throws (status 503) if GROQ_API_KEY isn't set, and
 * rethrows network/parse errors — callers wrap this so a scan failure never
 * breaks the underlying photo upload.
 */
export async function scanReceipt(absFilePath, mimetype = 'image/jpeg') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw unavailable('receipt OCR is not configured (GROQ_API_KEY missing)');
  const model = process.env.GROQ_MODEL;
  if (!model) throw unavailable('receipt OCR is not configured (GROQ_MODEL missing)');
  const baseUrl = process.env.GROQ_BASE_URL || DEFAULT_BASE_URL;

  const bytes = await fs.readFile(absFilePath);
  const dataUrl = `data:${mimetype};base64,${bytes.toString('base64')}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Groq OCR failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq OCR returned no content');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Groq OCR returned non-JSON content');
  }

  return {
    merchant: str(parsed.merchant),
    total: parseTotal(parsed.total),
    currency: str(parsed.currency),
    date: str(parsed.date),
  };
}
