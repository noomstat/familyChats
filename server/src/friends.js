// Phase U — Friends foundation: per-user X25519 identity keys, friend codes,
// and QR-based instant connect. Family-independent (unlike chat.js/lists.js,
// nothing here touches family_members or the active-family request context)
// — a friendship is a relationship between two users, full stop.
//
// The server NEVER sees a private key — only the public half (published via
// publishKey) and an opaque friend_token (random, shown only inside the
// owner's own QR — see app/src/crypto/friends.ts's buildFriendCode). It
// cannot derive the pairwise shared key friends use for Phase V's E2EE chat;
// that's pure client-side X25519 Diffie-Hellman.
import crypto from 'node:crypto';
import { query } from './db.js';
import { broadcastToUsers } from './ws.js';

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

function randomToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function mapFriendRow(row) {
  return { id: row.id, name: row.name, username: row.username, publicKey: row.public_key, photoUrl: row.photo_url ?? null };
}

/**
 * Upsert this user's published public key. Generates a fresh friend_token on
 * first publish; re-publishing (e.g. a re-install that generated a new
 * keypair) keeps the SAME token so any QR codes shown before still work,
 * unless the row didn't exist yet.
 */
export async function publishKey({ userId, publicKey }) {
  if (typeof publicKey !== 'string' || !publicKey.trim()) throw badRequest('publicKey is required');

  const { rows } = await query(
    `INSERT INTO user_keys (user_id, public_key, friend_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET public_key = EXCLUDED.public_key
     RETURNING user_id, public_key, friend_token`,
    [userId, publicKey.trim(), randomToken()],
  );
  const row = rows[0];
  return { publicKey: row.public_key, friendToken: row.friend_token };
}

/** Every friend of `userId`, with their current public key (null if that friend has never published one). */
export async function getFriends(userId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.username, u.photo_url, uk.public_key
     FROM friendships f
     JOIN users u ON u.id = f.friend_id
     LEFT JOIN user_keys uk ON uk.user_id = f.friend_id
     WHERE f.user_id = $1
     ORDER BY f.created_at ASC`,
    [userId],
  );
  return rows.map(mapFriendRow);
}

/** Every friend id of `userId` — used to fan out a live profile-photo update (see server.js's POST/DELETE /me/photo). */
export async function listFriendIds(userId) {
  const { rows } = await query('SELECT friend_id FROM friendships WHERE user_id = $1', [userId]);
  return rows.map((r) => r.friend_id);
}

/** This user's own profile as their friends see it (mirrors mapFriendRow's shape) — used to broadcast a live profile-photo update to every friend (see server.js's POST/DELETE /me/photo). Null if the user has no row here (shouldn't happen for an authed caller, but defensive). */
export async function getFriendProfile(userId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.username, u.photo_url, uk.public_key
     FROM users u
     LEFT JOIN user_keys uk ON uk.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return rows[0] ? mapFriendRow(rows[0]) : null;
}

/**
 * This user's own QR payload: their id, current friend_token, and public
 * key. Ensures a key/token exist (generating a fresh identity-less
 * placeholder token would be wrong — a friend code with no real public key
 * is useless — so this only succeeds once the user has published a key at
 * least once via publishKey; see the app's identity-ready effect, which
 * always publishes before this is ever needed).
 */
export async function getMyFriendCode(userId) {
  const { rows } = await query('SELECT public_key, friend_token FROM user_keys WHERE user_id = $1', [userId]);
  const row = rows[0];
  if (!row) throw notFound('no published key yet — publish an identity key first');
  return { userId, friendToken: row.friend_token, publicKey: row.public_key };
}

/**
 * Instant-connect: the caller scanned (or typed) `friendId`'s QR code,
 * carrying `token` (that user's current friend_token) and the caller's own
 * public key (published/re-published here in the same call so a first-time
 * user doesn't need a separate publishKey round-trip before connecting).
 * Validates the token, inserts BOTH directed friendship rows (idempotent —
 * ON CONFLICT DO NOTHING, so re-scanning an existing friend's code is a
 * harmless no-op), and broadcasts to both users so their friends lists
 * update live. Returns the new friend (from the caller's perspective).
 */
export async function connectByQr({ userId, friendId, token, myPublicKey }) {
  if (!friendId) throw badRequest('friendId is required');
  if (typeof myPublicKey !== 'string' || !myPublicKey.trim()) throw badRequest('myPublicKey is required');
  if (friendId === userId) throw badRequest("can't connect to yourself");

  const { rows: friendRows } = await query('SELECT id, name, username, photo_url FROM users WHERE id = $1', [friendId]);
  const friendUser = friendRows[0];
  if (!friendUser) throw notFound('no such user');

  const { rows: keyRows } = await query('SELECT public_key, friend_token FROM user_keys WHERE user_id = $1', [friendId]);
  const friendKey = keyRows[0];
  // A missing/empty token is treated the same as a wrong one (403, not 400) —
  // both mean "you didn't present a valid friend code for this user".
  if (!friendKey || !token || friendKey.friend_token !== token) throw forbidden('invalid or expired friend code');

  // Publish/refresh the caller's own key as part of the same connect (mirrors
  // publishKey's upsert — keeps the existing token if this user already has one).
  await query(
    `INSERT INTO user_keys (user_id, public_key, friend_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET public_key = EXCLUDED.public_key`,
    [userId, myPublicKey.trim(), randomToken()],
  );

  await query(
    `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)
     ON CONFLICT (user_id, friend_id) DO NOTHING`,
    [userId, friendId],
  );

  const { rows: meRows } = await query('SELECT id, name, username, photo_url FROM users WHERE id = $1', [userId]);
  const meUser = meRows[0];

  const newFriendForCaller = {
    id: friendUser.id,
    name: friendUser.name,
    username: friendUser.username,
    publicKey: friendKey.public_key,
    photoUrl: friendUser.photo_url ?? null,
  };
  const newFriendForTarget = {
    id: meUser.id,
    name: meUser.name,
    username: meUser.username,
    publicKey: myPublicKey.trim(),
    photoUrl: meUser.photo_url ?? null,
  };

  broadcastToUsers([userId], { type: 'friend', action: 'upsert', friend: newFriendForCaller });
  broadcastToUsers([friendId], { type: 'friend', action: 'upsert', friend: newFriendForTarget });

  return newFriendForCaller;
}
