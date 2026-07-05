# FamilyChats server

Postgres-backed backend for FamilyChats. Two **separate processes** that share
the same database and queue:

- **`server.js`** (API) — registers device push tokens and *enqueues* notifications.
- **`worker.js`** (worker) — the split-off notification worker that actually sends
  pushes via the Expo Push API, with retries and delivery-receipt cleanup.

Queue: [`pg-boss`](https://github.com/timgit/pg-boss) — jobs live in Postgres
(schema `pgboss`, auto-created). **No Redis.**

## Setup

```bash
cd server
npm install
cp .env.example .env      # set DATABASE_URL
npm run migrate           # creates device_tokens (+ _migrations)
```

## Run (two processes)

```bash
npm start      # API  → :3002
npm run worker # notification worker (scale this independently)
```

The worker can run on a different host/container from the API — they only need
the same `DATABASE_URL`. If the worker is down, jobs queue in Postgres and are
processed when it comes back.

## Flow

```
domain event ──▶ notifyUsers({ userIds, title, body, data })   [API / any code]
             └─▶ pg-boss  (push:send job in Postgres)
                     └─▶ worker: look up device_tokens, chunk (100/req),
                         POST to Expo Push API, retry on failure
                             └─▶ push:receipts job (+15 min, delayed)
                                     └─▶ worker: read receipts,
                                         delete DeviceNotRegistered tokens
```

## API

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/devices` | `{ userId, expoToken, platform }` | Upsert a device token |
| DELETE | `/devices/:token` | – | Remove a token (logout) |
| POST | `/notify` | `{ userIds[], title, body, data }` | Enqueue a push (example/testing) |

> `userId` is taken from the request body here for brevity — wire it to your
> auth/session middleware before shipping.

## Hooking up real events

Call `notifyUsers(...)` from your existing domain logic instead of `/notify`:

```js
import { notifyUsers } from './src/notifications.js';

// on a new group message
await notifyUsers({
  userIds: recipientIds,
  title: group.name,
  body: `${sender}: ${text}`,
  data: { type: 'message', groupId: group.id },
});
```

## App side (not included here)

The Expo app needs to request permission, get its Expo push token
(`expo-notifications`), and `POST /devices` on login. That's the remaining
client piece — ask and I'll add the hook into `app/src/store`.
