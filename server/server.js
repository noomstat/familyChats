// API process (`npm start`). Registers device tokens and enqueues notifications.
// It does NOT send pushes — that's the worker's job. Enqueue only.
import express from 'express';
import { getBoss, stopBoss } from './src/queue.js';
import { notifyUsers, registerToken, removeToken } from './src/notifications.js';
import { pool } from './src/db.js';

await getBoss(); // ensure queues exist so producer sends succeed

const app = express();
app.use(express.json());

// TODO: replace the `userId` in these bodies with the authenticated user from
// your session/JWT middleware — never trust a client-supplied user id.

app.post('/devices', async (req, res, next) => {
  try {
    const { userId, expoToken, platform } = req.body ?? {};
    if (!userId || !expoToken || !platform) return res.status(400).json({ error: 'userId, expoToken, platform required' });
    await registerToken({ userId, expoToken, platform });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.delete('/devices/:token', async (req, res, next) => {
  try {
    await removeToken(req.params.token);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Example trigger. In practice you'd call notifyUsers() from inside your domain
// logic (on new message, live-share start, expense added, settle, …).
app.post('/notify', async (req, res, next) => {
  try {
    const { userIds, title, body, data } = req.body ?? {};
    if (!userIds?.length || !title) return res.status(400).json({ error: 'userIds[] and title required' });
    const job = await notifyUsers({ userIds, title, body, data });
    res.status(202).json({ jobId: job });
  } catch (err) {
    next(err);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

const port = Number(process.env.PORT) || 3002;
const httpServer = app.listen(port, () => console.log(`[api] listening on :${port}`));

async function shutdown(signal) {
  console.log(`[api] ${signal} — shutting down`);
  httpServer.close();
  await stopBoss();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
