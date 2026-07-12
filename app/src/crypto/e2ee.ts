// Phase K — family shared-key E2EE. Pure functions only (no I/O, no React) —
// key persistence lives in ../store/keyStorage.ts, wiring lives in AppStore.tsx.
//
// Cipher: XChaCha20-Poly1305 via @noble/ciphers (pure JS — one code path on
// Expo Go, native builds, and web). Model: one 32-byte symmetric key per
// family, generated on-device, distributed only inside an "extended invite"
// (`CODE#K1.<key>`) — the `#…` part never touches the server. This is NOT
// forward-secret (no Signal-style ratchet): anyone who ever holds the key can
// decrypt the entire history. See README's E2EE section for the full
// trade-off writeup.
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';
import * as Crypto from 'expo-crypto';

const ENVELOPE_PREFIX = 'e2e:1:';
const KEY_BYTES = 32;
const NONCE_BYTES = 24; // XChaCha20's extended nonce

// ── base64 (standard + url-safe) — no Buffer on RN, so a small manual codec ──

const B64_STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  const alphabet = urlSafe ? B64_URL : B64_STD;
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + (urlSafe ? '' : '==');
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + (urlSafe ? '' : '=');
  }
  return out;
}

function base64ToBytes(input: string): Uint8Array {
  // Accept either alphabet and optional padding — the extended-invite key
  // segment is url-safe/unpadded, envelope segments are standard/padded.
  const clean = input.replace(/[-_]/g, (c) => (c === '-' ? '+' : '/')).replace(/=+$/g, '');
  const revStd = new Map<string, number>();
  for (let i = 0; i < B64_STD.length; i++) revStd.set(B64_STD[i], i);

  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const val = revStd.get(ch);
    if (val === undefined) continue; // ignore whitespace/newlines defensively
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

// ── key/nonce generation ──────────────────────────────────────

/** A fresh random 32-byte family key, base64-encoded (standard alphabet). */
export async function generateFamilyKey(): Promise<string> {
  const bytes = await getRandomBytes(KEY_BYTES);
  return bytesToBase64(bytes);
}

async function getRandomBytes(n: number): Promise<Uint8Array> {
  // expo-crypto exposes both a sync and async getter depending on platform
  // support — prefer sync when present (native), else await the async one
  // (web fallback wraps crypto.getRandomValues either way).
  if (typeof (Crypto as any).getRandomBytes === 'function') {
    return (Crypto as any).getRandomBytes(n);
  }
  return Crypto.getRandomBytesAsync(n);
}

// ── envelope encrypt/decrypt ──────────────────────────────────

export interface E2eePayload {
  text?: string;
  loc?: { label: string; meta?: string; live?: boolean };
}

/** True if `body` looks like an E2EE envelope (any version) — cheap prefix check. */
export function isEnvelope(body: string | null | undefined): boolean {
  return typeof body === 'string' && body.startsWith(ENVELOPE_PREFIX);
}

/** Encrypts `{text?, loc?}` into the wire envelope `e2e:1:<b64 nonce>.<b64 ciphertext>`. */
export async function encryptPayload(keyB64: string, payload: E2eePayload): Promise<string> {
  const key = base64ToBytes(keyB64);
  const nonce = await getRandomBytes(NONCE_BYTES);
  const plaintext = utf8ToBytes(JSON.stringify(payload));
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);
  return `${ENVELOPE_PREFIX}${bytesToBase64(nonce)}.${bytesToBase64(ciphertext)}`;
}

/**
 * Decrypts an envelope produced by encryptPayload(). Returns null on ANY
 * failure — bad prefix, malformed envelope, tampered ciphertext, or wrong
 * key (AEAD auth-tag mismatch throws inside @noble/ciphers) — callers render
 * that as a locked/undecryptable message, never as a thrown error.
 */
export function decryptPayload(keyB64: string, envelope: string): E2eePayload | null {
  if (!isEnvelope(envelope)) return null;
  const rest = envelope.slice(ENVELOPE_PREFIX.length);
  const dot = rest.indexOf('.');
  if (dot < 0) return null;
  try {
    const key = base64ToBytes(keyB64);
    const nonce = base64ToBytes(rest.slice(0, dot));
    const ciphertext = base64ToBytes(rest.slice(dot + 1));
    if (key.length !== KEY_BYTES || nonce.length !== NONCE_BYTES) return null;
    const plaintext = xchacha20poly1305(key, nonce).decrypt(ciphertext);
    const parsed = JSON.parse(bytesToUtf8(plaintext));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as E2eePayload;
  } catch {
    return null; // tamper, wrong key, or malformed JSON — all render as locked
  }
}

// ── extended invite (`CODE#K1.<key>`) ─────────────────────────

/** Builds the shareable extended invite: the plain code + a `#K1.<key>` suffix that never reaches the server. */
export function buildExtendedInvite(code: string, keyB64: string): string {
  // Re-encode the key url-safe (no '/' or '+' to clash with sharing/URLs), unpadded.
  const keyBytes = base64ToBytes(keyB64);
  return `${code}#K1.${bytesToBase64(keyBytes, true)}`;
}

/**
 * Parses either a plain invite code or an extended invite (`CODE#K1.<key>`)
 * into `{code, keyB64?}`. `keyB64` is always re-encoded to the standard
 * alphabet so callers can feed it straight to encrypt/decryptPayload. Tolerant
 * of surrounding whitespace and a pasted-with-spaces key segment.
 */
export function parseInvite(input: string): { code: string; keyB64?: string } {
  const trimmed = input.trim();
  const hashIdx = trimmed.indexOf('#');
  if (hashIdx < 0) return { code: trimmed.toUpperCase() };

  const code = trimmed.slice(0, hashIdx).trim().toUpperCase();
  let keyPart = trimmed.slice(hashIdx + 1).trim();
  // Strip the "K1." version marker if present.
  if (keyPart.startsWith('K1.')) keyPart = keyPart.slice(3);
  if (!keyPart) return { code };

  const keyBytes = base64ToBytes(keyPart);
  if (keyBytes.length !== KEY_BYTES) return { code }; // malformed key segment — degrade to code-only join
  return { code, keyB64: bytesToBase64(keyBytes) };
}

/**
 * The "enter your family key" sheet accepts either a full extended invite
 * (`CODE#K1.<key>`, code ignored — the user is already a member) or a bare
 * pasted key. Returns a standard-base64 32-byte key, or undefined if the
 * input isn't a recognizable key of either shape.
 */
export function parseKeyInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (trimmed.includes('#')) return parseInvite(trimmed).keyB64;
  const keyPart = trimmed.startsWith('K1.') ? trimmed.slice(3) : trimmed;
  const keyBytes = base64ToBytes(keyPart);
  if (keyBytes.length !== KEY_BYTES) return undefined;
  return bytesToBase64(keyBytes);
}
