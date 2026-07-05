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

A native app (iOS / Android / web via Expo) with four surfaces:

- **Chats** — group & DM list with live-now / unread filters, search.
- **Thread** — messaging with inline shared-location tiles and a "share live location" sheet (15 min / 1 hr / until stopped).
- **Expenses** — income/expense summary grouped **by category** and **by person**, with a shareable receipt. Amounts are in **THB**.
- **Map** & **You** — live map view and profile/settings.

Design language: *warm cartography meets messaging* — coral (`#FF5A3C`) for actions, ping-green for live presence, warm paper neutrals, rounded chat-bubble geometry, and a mono face for coordinates/timestamps.

### Run it

```bash
cd app
npm install
npm start        # Expo dev server — press i / a / w for iOS / Android / web
```

Requires Node 18+. Fonts (Bricolage Grotesque, Figtree, Space Mono) load from `@expo-google-fonts`; icons from `lucide-react-native`.

## Status

Core screens, navigation, theme tokens, and the component library are implemented against the design system. Data is currently sample data (`app/src/data/familyChats.ts`) — the next step is wiring a real backend for messaging, presence/location, and the expense ledger.
