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
- **End-to-end encryption (opt-in, per family)** — text and location messages can be end-to-end encrypted with a family shared key; see "End-to-end encryption" below.
- **Calendar** — shared family events, month view + agenda.
- **Grocery** — a shared, live-updating grocery list.
- **Tasks** — a shared task board with assignees and due dates.
- **Albums** — shared photo albums with uploads.
- **AI summary & search** — a "Catch me up" thread summary and natural-language family search over messages/tasks/events/grocery/photos (needs an `ANTHROPIC_API_KEY` on the server; degrades to a friendly message without one).
- **Memories** — a family memory timeline merging photos, past events, and milestones (family founded, members joined, chats created), grouped by month.
- **Push notifications** — new messages and task assignments push to devices (Expo push, via a Postgres-backed job queue).
- **Family Finance** — a family-wide shared ledger: monthly budget hero, expenses grouped **by category** and **by person** (amounts in **THB**), split bills, settle-up, payment reminders, and AI receipt scan (needs an `ANTHROPIC_API_KEY` on the server; degrades to manual entry with the photo attached without one). Fully synced through the family server.
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

## End-to-end encryption

Any family owner can turn on end-to-end encryption for their family (You screen → "Enable encryption"; new families created in the app turn it on automatically at creation). It's **shared-key E2EE, not Signal-style**: honest about the trade-off, so here's exactly what that means.

**Model.** A single 32-byte symmetric key is generated on-device when encryption is enabled, encrypts/decrypts with XChaCha20-Poly1305 (via [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers), pure JS — one code path on native and web, no native crypto module). The key is distributed only inside an **extended invite** — the plain 6-character invite code plus a `#K1.<key>` suffix (e.g. `FAM123#K1.<base64url key>`). The `#…` part is parsed and stripped entirely client-side before the join request; the server only ever sees the plain code. Everyone who has the key can read the entire family's encrypted history from any device — losing the key means that history is gone for good, and there is no way to recover it, not even for us.

**What's protected:** message *text* and *location* payloads (label/coordinates) for kinds `text`/`loc`, end-to-end — plaintext never reaches the server or the database; only the ciphertext envelope (`e2e:1:<nonce>.<ciphertext>`) is stored, and a tampered or wrong-key envelope simply renders as a locked bubble rather than garbage text.

**What's NOT protected (v1 scope):**
- **Voice messages and photos** stay unencrypted (uploaded files) — this is the biggest gap and the top follow-up item.
- **Metadata leaks**: who's in a chat, when messages were sent, and each message's `kind` (text vs. location) are all visible to the server, same as any messaging app without sealed sender.
- **No forward secrecy** — this is a static shared key, not a ratcheting protocol (no Signal Double Ratchet). Anyone who ever holds the key can decrypt everything sent before or after they got it. There's also no per-device key/revocation: removing a device or a person from the family doesn't rotate the key.
- **No disabling once enabled** — turning encryption on for a family is one-way in v1 (avoids the ambiguity of a mixed plaintext/ciphertext history).
- **Regenerating the invite CODE does not rotate the KEY** — the two are independent; a new code doesn't invalidate anyone's copy of the key.
- **AI features can't read encrypted chats** — "Catch me up" summaries and AI family search both explicitly skip encrypted message bodies (the server can't decrypt them either), and surface a friendly "this chat is end-to-end encrypted" message instead of erroring.
- **Push notification previews degrade to "🔒 New message"** for encrypted chats — no preview text is ever sent through the push pipeline for them.

**Verifying someone actually has the right key** is on the honor system in v1 (no key-fingerprint / safety-number comparison UI) — if a locked bubble unlocks after entering a key, that's the confirmation.

## Status

Auth, the Family Space, and all ten features above are implemented end-to-end against a real Postgres + WebSocket backend (`server/`). The app's local Context+reducer store (`app/src/store`) is hydrated from the server (`/bootstrap` + `/sync` + realtime WS events) and persists to `AsyncStorage` for offline reads.

### Known limitations

- **E2EE covers text/location only** — voice messages and photos are not encrypted (see "End-to-end encryption" above for the full trade-off list). "The Nows" (the seeded demo family) is **not** encrypted by default — it's opt-in per family, from the You screen.
- **expo-av is deprecated** as of Expo SDK 54 (superseded by `expo-audio`/`expo-video`) — FamilyChats' voice messages (`app/src/audio/voiceRecorder.ts`, `VoiceBubble`) still use it. It works today; migrating off it is tracked separately (see "Out of scope" in project planning docs).
- **AI features need `ANTHROPIC_API_KEY`** — chat "Catch me up" summaries, AI family search, and receipt scanning all degrade gracefully (a friendly message / manual-entry fallback with the photo attached) when the server has no key configured, rather than erroring.
- **Android push notifications need a custom dev build** — Expo Go on SDK 53+ dropped remote push support on Android; `expo-notifications` still works for local notifications, but new-message/task pushes on Android require building with EAS/`expo-dev-client` rather than running in Expo Go. iOS push works in Expo Go — verified live against a registered device token end-to-end through the Expo push service (job enqueued, sent, and a delivery ticket accepted; the worker also completed the follow-up receipt check with no delivery error reported).
