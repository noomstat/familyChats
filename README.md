# FamilyChats

A group-chat app with live location sharing and shared-expense splitting — built for families and close groups to coordinate, meet up, and settle costs.

Formerly prototyped under the working name *Rally*; renamed to **FamilyChats**.

## What's here

| Path | What it is |
| --- | --- |
| `app/` | The **React Native (Expo) app** — the real implementation. |
| `project/` | The **FamilyChats Design System** (HTML/CSS/JSX prototypes, tokens, components, UI kits) exported from [Claude Design](https://claude.ai/design). Source of truth for the visuals. |
| `chats/` | The design conversation transcript that captures product intent. |

## The app

A native app (iOS / Android / web via Expo), backed by a real Postgres server, built around one idea: a private, **invite-only Family Space**. Sign up, then create a family (you get a 6-character invite code) or join one with a code — everything below is shared with just that family:

- **Family Space** — invite-only tenancy; one family per account, members list, owner-only invite-code rotation.
- **Chats** — real-time group & DM messaging with inline shared-location tiles, live-location sharing, voice messages, read receipts, and unread badges.
- **Calendar** — shared family events, month view + agenda.
- **Grocery** — a shared, live-updating grocery list.
- **Tasks** — a shared task board with assignees and due dates.
- **Albums** — shared photo albums with uploads.
- **AI summary & search** — a "Catch me up" thread summary and natural-language family search over messages/tasks/events/grocery/photos (needs an `ANTHROPIC_API_KEY` on the server; degrades to a friendly message without one).
- **Memories** — a family memory timeline merging photos, past events, and milestones (family founded, members joined, chats created), grouped by month.
- **Push notifications** — new messages and task assignments push to devices (Expo push, via a Postgres-backed job queue).
- **Expenses** — income/expense summary grouped **by category** and **by person**, with a shareable receipt (amounts in **THB**). Local-only for now, not yet synced through the family server.
- **Map** & **You** — live map view and profile/settings (family name, invite code, logout).

Design language: *warm cartography meets messaging* — coral (`#FF5A3C`) for actions, ping-green for live presence, warm paper neutrals, rounded chat-bubble geometry, and a mono face for coordinates/timestamps.

### Run it

The server is two processes (API + a push-notification worker) sharing one Postgres database:

```bash
cd server
npm install
# create a .env with DATABASE_URL=postgres://...  (add ANTHROPIC_API_KEY to enable AI features)
npm run migrate         # create/upgrade tables, seed demo data
npm start                # API on :3002
npm run worker           # separate process — sends queued push notifications
```

Then, in another terminal:

```bash
cd app
npm install
npm start        # Expo dev server — press i / a / w for iOS / Android / web
```

Requires Node 18+ / 20.6+ for the server. Fonts (Bricolage Grotesque, Figtree, Space Mono) load from `@expo-google-fonts`; icons from `lucide-react-native`.

Demo login: username `you`, password `family123` (also seeded: `mara`, `dev`, `sam`, `mom`, all with the same password), already a member of family "The Nows" — invite code `FAM123` to join it from another account.

## Status

Auth, the Family Space, and all ten features above are implemented end-to-end against a real Postgres + WebSocket backend (`server/`). The app's local Context+reducer store (`app/src/store`) is hydrated from the server (`/bootstrap` + `/sync` + realtime WS events) and persists to `AsyncStorage` for offline reads. Expenses remains local-only/sample data (`app/src/data/familyChats.ts`) — the one surface not yet wired to the family server.
