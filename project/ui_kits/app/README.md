# Rally — Mobile App UI Kit

Interactive click-through recreation of the Rally mobile app (group chat + live location).

## Screens
- **Chat list** (`ChatListScreen`, `screens.jsx`) — wordmark header, search, filter chips (All / Live now / Groups / Unread), conversation rows with live rings + unread badges, bottom nav.
- **Thread** (`ThreadScreen`, `screens2.jsx`) — group header with live status, live-sharing banner, message thread with `ChatBubble` + embedded `LocationTile`, composer (location / input / send-or-mic), and the **share-location bottom sheet** (`ShareSheet`).
- **Live map** (`MapScreen`, `screens2.jsx`) — stylized map surface (`MapSurface`) with people (`MapPin` live) and a place pin, floating group header, and an "on the way" sheet.
- **You** (`YouScreen`, in `index.html`) — profile + settings with a live-by-default toggle.
- **Expenses** (`ExpensesScreen`, `expenses.jsx`; preview `expenses.html`) — the group ledger: dark balance hero ("You're owed"), income/expense totals (coral = expense, ping-green = income), a **By category / By people** segmented toggle, category bars, per-person paid/share/net with settle buttons, and a **shareable receipt** bottom sheet (`ReceiptSheet`) with line items, split-among avatars, and "Share to chat".

## How it composes
All visuals come from the design-system primitives on `window.RallyDesignSystem_84ab56` (`ChatBubble`, `ConversationRow`, `MapPin`, `LivePill`, `LocationTile`, `Avatar`, `Button`, `IconButton`, `Chip`, `Input`, `Switch`, `Icon`). Screens are thin compositions — no primitive is re-implemented here.

## Interactions
Tap a conversation → thread. Type → send. Tap the location button → share sheet → pick a duration → a live banner + live location tile appear. Bottom-nav Map → live map. Tap a location tile → jumps to the map.

## Notes
- The map is a **stylized CSS surface**, not a real map SDK. In production, drop a real tile image/map into `MapSurface` / `LocationTile mapSrc`.
- Icons are [Lucide](https://lucide.dev) via CDN.
