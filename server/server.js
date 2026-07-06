// API process (`npm start`). Auth, Family Space, device tokens, and the WS hub.
// Does NOT send pushes itself — notifyUsers() only enqueues; the worker sends.
import express from 'express';
import { getBoss, stopBoss } from './src/queue.js';
import { notifyUsers, registerToken, removeToken } from './src/notifications.js';
import { pool } from './src/db.js';
import { register, login, logout, requireAuth } from './src/auth.js';
import { createFamily, joinFamily, getFamilyForUser, regenerateCode } from './src/family.js';
import { attachWebSocketServer } from './src/ws.js';

await getBoss(); // ensure queues exist so producer sends succeed

const app = express();
app.use(express.json());

// ── Auth ─────────────────────────────────────────────────────

app.post('/auth/register', async (req, res, next) => {
  try {
    const user = await register(req.body ?? {});
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const { token, user } = await login(req.body ?? {});
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

app.post('/auth/logout', async (req, res, next) => {
  try {
    const header = req.get('authorization') ?? '';
    const [, token] = header.split(' ');
    await logout(token);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Authed routes ────────────────────────────────────────────

app.get('/me', requireAuth, async (req, res, next) => {
  try {
    const found = await getFamilyForUser(req.user.id);
    res.json({ user: req.user, family: found });
  } catch (err) {
    next(err);
  }
});

app.post('/families', requireAuth, async (req, res, next) => {
  try {
    const found = await createFamily({ name: req.body?.name, userId: req.user.id });
    res.status(201).json(found);
  } catch (err) {
    next(err);
  }
});

app.post('/families/join', requireAuth, async (req, res, next) => {
  try {
    const found = await joinFamily({ code: req.body?.code, userId: req.user.id });
    res.json(found);
  } catch (err) {
    next(err);
  }
});

app.post('/families/regenerate-code', requireAuth, async (req, res, next) => {
  try {
    const found = await getFamilyForUser(req.user.id);
    if (!found) return res.status(404).json({ error: 'not in a family' });
    const updated = await regenerateCode({ familyId: found.family.id, userId: req.user.id });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get('/families/members', requireAuth, async (req, res, next) => {
  try {
    const found = await getFamilyForUser(req.user.id);
    res.json({ members: found?.members ?? [] });
  } catch (err) {
    next(err);
  }
});

app.post('/devices', requireAuth, async (req, res, next) => {
  try {
    const { expoToken, platform } = req.body ?? {};
    if (!expoToken || !platform) return res.status(400).json({ error: 'expoToken, platform required' });
    await registerToken({ userId: req.user.id, expoToken, platform });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.delete('/devices/:token', requireAuth, async (req, res, next) => {
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
attachWebSocketServer(httpServer);

async function shutdown(signal) {
  console.log(`[api] ${signal} — shutting down`);
  httpServer.close();
  await stopBoss();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
