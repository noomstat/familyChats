// Realtime hub: one `ws` WebSocketServer attached to the API's HTTP server at
// path `/ws`. Auth happens on upgrade via `?token=` (a session token from
// auth.js) — there is no unauthenticated socket. Later phases broadcast typed
// domain events (`message`, `read`, `task`, …) through the exports below.
import { WebSocketServer } from 'ws';
import { getSessionUser } from './auth.js';
import { query } from './db.js';

const WS_PATH = '/ws';
const HEARTBEAT_MS = 30_000;

/** userId -> Set<WebSocket>. A user may have several connected devices/tabs. */
const registry = new Map();

function addSocket(userId, socket) {
  let set = registry.get(userId);
  if (!set) {
    set = new Set();
    registry.set(userId, set);
  }
  set.add(socket);
}

function removeSocket(userId, socket) {
  const set = registry.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) registry.delete(userId);
}

function send(socket, event) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(event));
}

/** Send a typed event to every connected socket of each given user. */
export function broadcastToUsers(userIds, event) {
  for (const userId of userIds ?? []) {
    const sockets = registry.get(userId);
    if (!sockets) continue;
    for (const socket of sockets) send(socket, event);
  }
}

/** Send a typed event to every member of a family (looked up fresh each call). */
export async function broadcastToFamily(familyId, event) {
  const { rows } = await query('SELECT user_id FROM family_members WHERE family_id = $1', [familyId]);
  broadcastToUsers(rows.map((r) => r.user_id), event);
}

/** Attach the WS hub to an already-listening HTTP server. */
export function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get('token');
    getSessionUser(token)
      .then((user) => {
        if (!user) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req, user);
        });
      })
      .catch(() => socket.destroy());
  });

  wss.on('connection', (ws, _req, user) => {
    ws.isAlive = true;
    ws.userId = user.id;
    addSocket(user.id, ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('close', () => removeSocket(user.id, ws));
    ws.on('error', () => removeSocket(user.id, ws));

    send(ws, { type: 'hello', userId: user.id });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        if (ws.userId) removeSocket(ws.userId, ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}
