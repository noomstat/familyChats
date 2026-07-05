import { Expo } from 'expo-server-sdk';
import { query } from './db.js';
import { getBoss, QUEUES } from './queue.js';

// ── Token storage (called by the API) ────────────────────────

export async function registerToken({ userId, expoToken, platform }) {
  if (!Expo.isExpoPushToken(expoToken)) {
    const err = new Error('Not a valid Expo push token');
    err.status = 400;
    throw err;
  }
  await query(
    `INSERT INTO device_tokens (expo_token, user_id, platform, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (expo_token)
     DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = now()`,
    [expoToken, userId, platform],
  );
}

export async function removeToken(expoToken) {
  await query('DELETE FROM device_tokens WHERE expo_token = $1', [expoToken]);
}

// ── Producer (called by domain events: new message, live-share, expense, …) ──

/**
 * Enqueue a push to a set of users. Returns immediately; the separate worker
 * process does the actual sending, with retries handled by pg-boss.
 */
export async function notifyUsers({ userIds, title, body, data = {} }) {
  if (!userIds?.length) return null;
  const boss = await getBoss();
  return boss.send(
    QUEUES.SEND,
    { userIds, title, body, data },
    { retryLimit: 5, retryBackoff: true, expireInMinutes: 30 },
  );
}
