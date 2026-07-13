// Phase U — per-user X25519 identity keys for the Friends feature. Pure
// functions only (no I/O, no React) — mirrors e2ee.ts's module shape; key
// persistence lives in ../store/identityKeyStorage.ts, wiring lives in
// AppStore.tsx.
//
// Model: every user generates ONE identity keypair on-device (once, the
// first time the Friends feature is touched). The public key is published to
// the server (server/src/friends.js); the private key never leaves the
// device. Two friends independently derive the SAME 32-byte symmetric key
// via X25519 Diffie-Hellman (`deriveSharedKey`) — nothing is transmitted to
// agree on it, and the server never sees it. Phase V (friend chat) uses that
// derived key with e2ee.ts's `encryptPayload`/`decryptPayload` exactly like
// a family key.
//
// Deviation from the original plan: `@noble/curves` v2's `x25519` module
// does NOT expose `x25519.utils.randomPrivateKey()` — the current API is
// `x25519.utils.randomSecretKey()` (also `x25519.keygen()` returns both
// halves at once). Verified directly against the installed package before
// writing this file.
import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';

const KEY_BYTES = 32;

// ── base64 (standard alphabet) — same small manual codec as e2ee.ts (no
// Buffer on RN). Duplicated rather than imported: e2ee.ts's codec is a
// private implementation detail of that module, and the repo's convention
// (see keyStorage.ts vs tokenStorage.ts) is a small amount of duplication
// per crypto/storage module over a shared-utils layer. ──────────────────

const B64_STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64_STD[(n >> 18) & 63] + B64_STD[(n >> 12) & 63] + B64_STD[(n >> 6) & 63] + B64_STD[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64_STD[(n >> 18) & 63] + B64_STD[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64_STD[(n >> 18) & 63] + B64_STD[(n >> 12) & 63] + B64_STD[(n >> 6) & 63] + '=';
  }
  return out;
}

/** Accepts standard OR url-safe base64, padded or not (the QR payload uses url-safe/unpadded). */
function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[-_]/g, (c) => (c === '-' ? '+' : '/')).replace(/=+$/g, '');
  const rev = new Map<string, number>();
  for (let i = 0; i < B64_STD.length; i++) rev.set(B64_STD[i], i);

  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const val = rev.get(ch);
    if (val === undefined) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Base64 (url-safe, unpadded) — used for the QR payload's key segment so it never needs URL-escaping. */
function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export interface IdentityKeypair {
  /** 32-byte X25519 private scalar, base64 (standard alphabet). NEVER sent to the server. */
  privB64: string;
  /** 32-byte X25519 public key, base64 (standard alphabet). Safe to publish. */
  pubB64: string;
}

/** Generates a fresh X25519 identity keypair. */
export function generateIdentityKeypair(): IdentityKeypair {
  const { secretKey, publicKey } = x25519.keygen();
  return { privB64: bytesToBase64(secretKey), pubB64: bytesToBase64(publicKey) };
}

/**
 * Derives the 32-byte symmetric key two friends share, given MY private key
 * and THEIR public key — both sides compute the identical key independently
 * (X25519 Diffie-Hellman), so nothing about it ever crosses the network. The
 * raw DH output is hashed (SHA-256) before use so the result is a
 * uniformly-random key rather than raw curve output — same rationale as any
 * ECDH-then-KDF construction. Returns a base64 string directly usable by
 * e2ee.ts's encryptPayload/decryptPayload (Phase V).
 */
export function deriveSharedKey(myPrivB64: string, theirPubB64: string): string {
  const priv = base64ToBytes(myPrivB64);
  const pub = base64ToBytes(theirPubB64);
  const shared = x25519.getSharedSecret(priv, pub);
  const hashed = sha256(shared);
  return bytesToBase64(hashed.slice(0, KEY_BYTES));
}

// ── friend-code QR payload: fc:1:<userId>.<friendToken>.<pubKeyB64url> ──

const CODE_PREFIX = 'fc:1:';

export interface FriendCodePayload {
  userId: string;
  friendToken: string;
  pubKeyB64: string;
}

/** Builds the QR/typed-code payload string from GET /friends/code's response. */
export function buildFriendCode(payload: FriendCodePayload): string {
  const pubUrl = bytesToBase64Url(base64ToBytes(payload.pubKeyB64));
  return `${CODE_PREFIX}${payload.userId}.${payload.friendToken}.${pubUrl}`;
}

/** Parses a scanned/typed `fc:1:<userId>.<friendToken>.<pubKeyB64url>` code. Returns null if malformed. */
export function parseFriendCode(input: string): FriendCodePayload | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return null;
  const rest = trimmed.slice(CODE_PREFIX.length);
  const parts = rest.split('.');
  if (parts.length !== 3) return null;
  const [userId, friendToken, pubUrl] = parts;
  if (!userId || !friendToken || !pubUrl) return null;
  const pubBytes = base64ToBytes(pubUrl);
  if (pubBytes.length !== KEY_BYTES) return null;
  return { userId, friendToken, pubKeyB64: bytesToBase64(pubBytes) };
}
