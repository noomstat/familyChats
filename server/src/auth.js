// Registration, login, sessions, and the requireAuth middleware.
// Passwords are hashed with bcryptjs; sessions are opaque random tokens
// stored server-side (no JWTs — simplest thing that supports logout).
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function unauthorized(message = 'Unauthorized') {
  const err = new Error(message);
  err.status = 401;
  return err;
}

/** Strip password_hash before a user row ever leaves this module. */
function toPublicUser(row) {
  if (!row) return row;
  return { id: row.id, username: row.username, name: row.name };
}

/**
 * Create a new user. Validates username shape (`[a-z0-9_]{3,20}`, lowercase)
 * and password length (>= 6). The client may supply its own id (the app's
 * `uid()` convention); otherwise one is generated.
 */
export async function register({ id, username, password, name }) {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    throw badRequest('username must be 3-20 lowercase letters, numbers, or underscores');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw badRequest('password must be at least 6 characters');
  }
  if (typeof name !== 'string' || !name.trim()) {
    throw badRequest('name is required');
  }

  const { rowCount } = await query('SELECT 1 FROM users WHERE username = $1', [username]);
  if (rowCount) throw badRequest('username already taken');

  const userId = id || crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await query(
    `INSERT INTO users (id, username, name, password_hash) VALUES ($1, $2, $3, $4)
     RETURNING id, username, name`,
    [userId, username, name.trim(), passwordHash],
  );
  return toPublicUser(rows[0]);
}

/** Verify credentials and open a new session. Returns `{ token, user }`. */
export async function login({ username, password }) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw badRequest('username and password required');
  }

  const { rows } = await query('SELECT id, username, name, password_hash FROM users WHERE username = $1', [username]);
  const row = rows[0];
  if (!row) throw unauthorized('invalid username or password');

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw unauthorized('invalid username or password');

  const token = crypto.randomBytes(32).toString('hex');
  await query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, row.id]);

  return { token, user: toPublicUser(row) };
}

/** Invalidate a session token. Idempotent — logging out twice is a no-op. */
export async function logout(token) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

/** Look up the user behind a session token, or null if the token is invalid. */
export async function getSessionUser(token) {
  if (!token) return null;
  const { rows } = await query(
    `SELECT u.id, u.username, u.name
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token],
  );
  return toPublicUser(rows[0]) ?? null;
}

/**
 * Express middleware: requires `Authorization: Bearer <token>`, attaches
 * `req.user = { id, username, name }`, and touches the session's last_seen.
 * Responds 401 on a missing/invalid/expired token.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized('missing bearer token');

    const { rows } = await query(
      `UPDATE sessions SET last_seen = now() WHERE token = $1
       RETURNING (SELECT row_to_json(u) FROM (SELECT id, username, name FROM users WHERE id = sessions.user_id) u) AS user`,
      [token],
    );
    const user = rows[0]?.user;
    if (!user) throw unauthorized('invalid or expired session');

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}
