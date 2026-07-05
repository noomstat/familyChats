import { Expo } from 'expo-server-sdk';
import { query } from './db.js';
import { removeToken } from './notifications.js';
import { QUEUES } from './queue.js';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN || undefined });

// pg-boss v10 delivers a batch (array) of jobs to a worker.
const asList = (jobs) => (Array.isArray(jobs) ? jobs : [jobs]);

/** Register both push handlers on the running boss instance. */
export function registerPushHandlers(boss) {
  boss.work(QUEUES.SEND, (jobs) => Promise.all(asList(jobs).map((j) => handleSend(boss, j.data))));
  boss.work(QUEUES.RECEIPTS, (jobs) => Promise.all(asList(jobs).map((j) => handleReceipts(j.data))));
}

async function handleSend(boss, { userIds, title, body, data }) {
  const { rows } = await query(
    'SELECT expo_token FROM device_tokens WHERE user_id = ANY($1::text[])',
    [userIds],
  );
  if (rows.length === 0) return;

  const messages = [];
  for (const { expo_token } of rows) {
    if (!Expo.isExpoPushToken(expo_token)) {
      await removeToken(expo_token); // stale/garbage token
      continue;
    }
    messages.push({ to: expo_token, sound: 'default', title, body, data });
  }

  // ticketId -> token, so the delayed receipt check can prune dead devices.
  const receiptItems = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    // Throwing here lets pg-boss retry the whole job with backoff.
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.forEach((ticket, i) => {
      const token = chunk[i].to;
      if (ticket.status === 'ok') {
        receiptItems.push({ ticketId: ticket.id, token });
      } else if (ticket.details?.error === 'DeviceNotRegistered') {
        removeToken(token).catch(() => {});
      }
    });
  }

  if (receiptItems.length) {
    // Expo says wait ~15 min before reading receipts.
    await boss.sendAfter(QUEUES.RECEIPTS, { items: receiptItems }, {}, 15 * 60);
  }
}

async function handleReceipts({ items }) {
  const tokenByTicket = new Map(items.map((i) => [i.ticketId, i.token]));
  const ids = items.map((i) => i.ticketId);
  for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
    for (const [ticketId, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
        await removeToken(tokenByTicket.get(ticketId));
      }
    }
  }
}
