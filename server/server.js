// API process (`npm start`). Auth, Family Space, device tokens, and the WS hub.
// Does NOT send pushes itself — notifyUsers() only enqueues; the worker sends.
import crypto from 'node:crypto';
import { unlink } from 'node:fs/promises';
import express from 'express';
import { getBoss, stopBoss } from './src/queue.js';
import { notifyUsers, registerToken, removeToken } from './src/notifications.js';
import { pool } from './src/db.js';
import { register, login, logout, requireAuth } from './src/auth.js';
import { createFamily, joinFamily, getFamilyForUser, regenerateCode } from './src/family.js';
import { attachWebSocketServer } from './src/ws.js';
import {
  getBootstrap,
  getSyncSince,
  getMessages,
  createMessage,
  setRead,
  createGroup,
  renameGroup,
  addMember,
  removeMember,
} from './src/chat.js';
import {
  listGrocery,
  addGrocery,
  toggleGrocery,
  removeGrocery,
  clearChecked,
  listTasks,
  addTask,
  updateTask,
  toggleTask,
  removeTask,
} from './src/lists.js';
import { listEvents, addEvent, updateEvent, removeEvent } from './src/events.js';
import { upload, UPLOADS_DIR } from './src/uploads.js';
import {
  listAlbums,
  createAlbum,
  renameAlbum,
  removeAlbum,
  listPhotos,
  addPhoto,
  removePhoto,
} from './src/albums.js';
import { summarizeGroup, searchFamily, scanReceipt } from './src/ai.js';
import { getTimeline } from './src/timeline.js';
import { addExpense, removeExpense, addTransfer, setBudget, remind } from './src/finance.js';

await getBoss(); // ensure queues exist so producer sends succeed

const app = express();

// CORS — the web build runs on a different origin (e.g. localhost:8081) than
// this API. Auth is Bearer-token (no cookies), so a permissive wildcard is
// fine for v1; tighten to an origin allowlist when deploying for real.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json());

// Uploaded files (photos now, voice messages in Phase F). Public read is
// acceptable for v1: filenames are crypto.randomUUID()-based and therefore
// unguessable, and the directory is never listed. Revisit (signed URLs /
// auth middleware) if that ever changes.
app.use('/uploads', express.static(UPLOADS_DIR));

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

// ── Family Chat ──────────────────────────────────────────────

app.get('/bootstrap', requireAuth, async (req, res, next) => {
  try {
    res.json(await getBootstrap(req.user.id));
  } catch (err) {
    next(err);
  }
});

app.get('/sync', requireAuth, async (req, res, next) => {
  try {
    const { after } = req.query;
    if (!after) return res.status(400).json({ error: 'after is required' });
    res.json(await getSyncSince(req.user.id, after));
  } catch (err) {
    next(err);
  }
});

app.get('/groups/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { before, limit } = req.query;
    const messages = await getMessages(req.params.id, req.user.id, { before, limit: limit ? Number(limit) : undefined });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

app.post('/groups/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { id, kind, body, loc, live } = req.body ?? {};
    const message = await createMessage({ id, groupId: req.params.id, authorId: req.user.id, kind, body, loc, live });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// Multipart: field `file` (the audio clip) + text fields `id` (client message
// id) and `durationMs`. Reuses the same upload infra as photo uploads
// (src/uploads.js), which already allowlists both image and audio mimes for
// multer's own filter — this route additionally rejects anything that isn't
// audio/* (e.g. someone posting a photo here), since that allowlist is shared
// across both media routes. The file is already on disk when the handler
// runs; on any failure (bad mime, not a member, duplicate id) it's unlinked
// so failed/duplicate uploads don't leak orphan files.
app.post('/groups/:id/voice', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    if (!req.file.mimetype.startsWith('audio/')) {
      await unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: `expected an audio file, got ${req.file.mimetype}` });
    }

    const { id, durationMs } = req.body ?? {};
    const mediaPath = `/uploads/${req.file.filename}`;
    const message = await createMessage({
      id,
      groupId: req.params.id,
      authorId: req.user.id,
      kind: 'voice',
      mediaPath,
      durationMs: Number(durationMs) || null,
    });

    // A duplicate `id` (client retry) returns the already-stored row untouched
    // — this upload's file was never referenced by it, so it's an orphan.
    if (!message || message.mediaPath !== mediaPath) {
      await unlink(req.file.path).catch(() => {});
    }

    res.status(201).json({ message });
  } catch (err) {
    if (req.file) await unlink(req.file.path).catch(() => {});
    next(err);
  }
});

app.post('/groups/:id/read', requireAuth, async (req, res, next) => {
  try {
    const { ts } = req.body ?? {};
    if (!ts) return res.status(400).json({ error: 'ts is required' });
    res.json(await setRead(req.params.id, req.user.id, ts));
  } catch (err) {
    next(err);
  }
});

app.post('/groups', requireAuth, async (req, res, next) => {
  try {
    const found = await getFamilyForUser(req.user.id);
    if (!found) return res.status(400).json({ error: 'not in a family' });
    const { id, name, memberIds } = req.body ?? {};
    const group = await createGroup({ id, familyId: found.family.id, name, memberIds, createdBy: req.user.id });
    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
});

app.patch('/groups/:id', requireAuth, async (req, res, next) => {
  try {
    const group = await renameGroup({ groupId: req.params.id, userId: req.user.id, name: req.body?.name });
    res.json({ group });
  } catch (err) {
    next(err);
  }
});

app.post('/groups/:id/members', requireAuth, async (req, res, next) => {
  try {
    const group = await addMember({ groupId: req.params.id, actorId: req.user.id, userId: req.body?.userId });
    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
});

app.delete('/groups/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const group = await removeMember({ groupId: req.params.id, actorId: req.user.id, userId: req.params.userId });
    res.json({ group });
  } catch (err) {
    next(err);
  }
});

// ── Shared Grocery List ──────────────────────────────────────

app.get('/grocery', requireAuth, async (req, res, next) => {
  try {
    const items = await listGrocery(req.user.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

app.post('/grocery', requireAuth, async (req, res, next) => {
  try {
    const { id, label, qty } = req.body ?? {};
    const item = await addGrocery({ id, label, qty, userId: req.user.id });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

app.post('/grocery/:id/toggle', requireAuth, async (req, res, next) => {
  try {
    const item = await toggleGrocery({ id: req.params.id, userId: req.user.id });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

app.delete('/grocery/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await removeGrocery({ id: req.params.id, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/grocery/clear-checked', requireAuth, async (req, res, next) => {
  try {
    const result = await clearChecked(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Shared Tasks ─────────────────────────────────────────────

app.get('/tasks', requireAuth, async (req, res, next) => {
  try {
    const tasks = await listTasks(req.user.id);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

app.post('/tasks', requireAuth, async (req, res, next) => {
  try {
    const { id, title, notes, assigneeId, dueDate } = req.body ?? {};
    const task = await addTask({ id, title, notes, assigneeId, dueDate, userId: req.user.id });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

app.patch('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, notes, assigneeId, dueDate } = req.body ?? {};
    const task = await updateTask({ id: req.params.id, patch: { title, notes, assigneeId, dueDate }, userId: req.user.id });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

app.post('/tasks/:id/toggle', requireAuth, async (req, res, next) => {
  try {
    const task = await toggleTask({ id: req.params.id, userId: req.user.id });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

app.delete('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await removeTask({ id: req.params.id, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Shared Calendar ──────────────────────────────────────────

app.get('/events', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const events = await listEvents(req.user.id, { from, to });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

app.post('/events', requireAuth, async (req, res, next) => {
  try {
    const { id, title, notes, startTs, endTs, allDay } = req.body ?? {};
    const event = await addEvent({ id, title, notes, startTs, endTs, allDay, userId: req.user.id });
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
});

app.patch('/events/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, notes, startTs, endTs, allDay } = req.body ?? {};
    const event = await updateEvent({ id: req.params.id, patch: { title, notes, startTs, endTs, allDay }, userId: req.user.id });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

app.delete('/events/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await removeEvent({ id: req.params.id, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Shared Photo Albums ──────────────────────────────────────

app.get('/albums', requireAuth, async (req, res, next) => {
  try {
    const albums = await listAlbums(req.user.id);
    res.json({ albums });
  } catch (err) {
    next(err);
  }
});

app.post('/albums', requireAuth, async (req, res, next) => {
  try {
    const { id, name } = req.body ?? {};
    const album = await createAlbum({ id, name, userId: req.user.id });
    res.status(201).json({ album });
  } catch (err) {
    next(err);
  }
});

app.patch('/albums/:id', requireAuth, async (req, res, next) => {
  try {
    const album = await renameAlbum({ id: req.params.id, name: req.body?.name, userId: req.user.id });
    res.json({ album });
  } catch (err) {
    next(err);
  }
});

app.delete('/albums/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await removeAlbum({ id: req.params.id, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/albums/:id/photos', requireAuth, async (req, res, next) => {
  try {
    const photos = await listPhotos(req.params.id, req.user.id);
    res.json({ photos });
  } catch (err) {
    next(err);
  }
});

// Multipart: field `file` (the image) + optional `id`/`caption`/`w`/`h` text
// fields. The file is already on disk when the handler runs — if the row
// insert is rejected (bad album, not a member, …), unlink it so failed
// uploads don't leak orphan files.
app.post('/albums/:id/photos', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const { id, caption, w, h } = req.body ?? {};
    const photo = await addPhoto({
      id: id || crypto.randomUUID(),
      albumId: req.params.id,
      userId: req.user.id,
      filePath: `/uploads/${req.file.filename}`,
      caption,
      w,
      h,
    });
    res.status(201).json({ photo });
  } catch (err) {
    if (req.file) await unlink(req.file.path).catch(() => {});
    next(err);
  }
});

app.delete('/photos/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await removePhoto({ id: req.params.id, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Family Finance ───────────────────────────────────────────

app.post('/expenses', requireAuth, async (req, res, next) => {
  try {
    const { id, label, categoryId, amount, paidBy, splitAmong, receiptPath } = req.body ?? {};
    const expense = await addExpense({ id, label, categoryId, amount, paidBy, splitAmong, receiptPath, userId: req.user.id });
    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
});

app.delete('/expenses/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await removeExpense({ id: req.params.id, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/transfers', requireAuth, async (req, res, next) => {
  try {
    const { id, toId, amount } = req.body ?? {};
    const transfer = await addTransfer({ id, toId, amount, userId: req.user.id });
    res.status(201).json({ transfer });
  } catch (err) {
    next(err);
  }
});

app.put('/budget', requireAuth, async (req, res, next) => {
  try {
    const { month, amount } = req.body ?? {};
    const budget = await setBudget({ month, amount, userId: req.user.id });
    res.json({ budget });
  } catch (err) {
    next(err);
  }
});

app.post('/finance/remind', requireAuth, async (req, res, next) => {
  try {
    const { toUserId, amount } = req.body ?? {};
    const result = await remind({ toUserId, amount, userId: req.user.id });
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

// Multipart: field `file` (the receipt photo). The photo is kept — and
// receiptPath returned — even when the AI scan itself fails/503s (no
// ANTHROPIC_API_KEY): manual entry with the photo attached is the fallback,
// same graceful-degrade UX as Phase G's chat summary/search.
app.post('/finance/scan-receipt', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    if (!req.file.mimetype.startsWith('image/')) {
      await unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: `expected an image file, got ${req.file.mimetype}` });
    }
    const receiptPath = `/uploads/${req.file.filename}`;
    let scan = null;
    let scanError;
    try {
      scan = await scanReceipt(receiptPath);
    } catch (err) {
      scanError = err.message || 'AI scan failed';
    }
    res.json(scanError ? { receiptPath, scan, scanError } : { receiptPath, scan });
  } catch (err) {
    if (req.file) await unlink(req.file.path).catch(() => {});
    next(err);
  }
});

// ── AI: Chat Summary + AI Search ──────────────────────────────

app.post('/groups/:id/summary', requireAuth, async (req, res, next) => {
  try {
    res.json(await summarizeGroup(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

app.post('/search', requireAuth, async (req, res, next) => {
  try {
    res.json(await searchFamily(req.body?.query, req.user.id));
  } catch (err) {
    next(err);
  }
});

// ── Memory Timeline ──────────────────────────────────────────

// Not part of /bootstrap or /sync — see src/timeline.js's header comment for
// why (derived, cheap to recompute, fetched only when the screen opens).
app.get('/timeline', requireAuth, async (req, res, next) => {
  try {
    res.json(await getTimeline(req.user.id));
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
  // Multer errors (e.g. LIMIT_FILE_SIZE) carry no .status of their own but
  // are always the client's fault — surface them as 400s, not 500s.
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({ error: err.message || 'Internal error' });
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
