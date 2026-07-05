# Rally Design System

**Rally** is a group-chat app with live location sharing — one chat for the plan, one map for the moment. This design system is **created from scratch** (no source codebase, Figma, or brand assets were provided); the brand, name, palette, and voice below are an original direction built for the product description "group chats application able to share location."

> **Sources given:** none — brand invented for this brief. If Rally has real brand assets (logo, fonts, colors), attach them via the Import menu and this system should be re-derived from them.

---

## Content fundamentals
- **Voice:** warm, brief, in-the-moment. Talk like a friend coordinating a meetup, not an app announcing a feature.
- **Person:** address the user as **you** ("You're sharing live for 1 hour"). Refer to the group as "your people," "your crew," "the group."
- **Casing:** sentence case everywhere — buttons, titles, nav. Only all-caps in mono eyebrows/labels (`GROUP CHAT + LIVE LOCATION`) and status badges (`LIVE`).
- **Location = presence, never surveillance.** Always frame sharing as user-controlled and time-boxed: "Stop anytime," "ends on its own," "not a minute more." Never "tracking," "monitor," "always on."
- **Emoji:** used sparingly and only in *user* chat content (👌), never in UI chrome, labels, or marketing copy.
- **Numbers/time:** timestamps, coordinates, ETAs, countdowns, and join codes are set in **mono** (Space Mono) to read as precise, machine-y data.
- **Examples:** ✓ "Rally the group — 3 already on the way." ✓ "You're sharing live for 1 hour. Stop anytime." ✗ "Initiate group coordination sequence." ✗ "Location tracking enabled."

## Visual foundations
- **Palette:** a warm-cartography scheme. **Coral (`--coral-500` #FF5A3C)** is the single action/signal color — pins, primary buttons, sends, your own chat bubbles. **Ping green (`--ping-500` #12B886)** means *live/presence* — location sharing, online, ETAs; it is never used for ordinary actions so "green = someone is here/moving." Warm **ink** neutrals (never pure gray, tinted toward brown) for text/borders on a warm **paper** (#FAF6F1) background; white cards. Sky blue is a quiet secondary for place pins/info. Semantic: success=ping, warning=amber, danger=rose, info=sky.
- **Type:** display **Bricolage Grotesque** (700–800, tight tracking) for headlines and the wordmark; body **Figtree** (16px base) for UI + prose; **Space Mono** for time/coordinate/code data.
- **Shape language:** round and friendly. Pills for all buttons/inputs/chips (`--radius-full`), 20px cards, and the **chat bubble** with one tucked corner (`22px` with a `6px` tuck toward the tail). The **coral teardrop map pin** is the signature motif (people = coral avatar pins, places = sky icon pins).
- **Backgrounds:** warm paper solids and stylized CSS "map" surfaces (soft green park blocks, water, white roads) — no photographic hero imagery by default, no busy gradients. Marketing allows soft radial coral/ping wash tints only.
- **Elevation:** warm-tinted soft shadows (brown-black base, low opacity), never harsh black. Pins get a coral-tinted lift (`--shadow-pin`); bubbles a small lift.
- **Motion:** quick and springy. Press = scale down (0.92–0.97); switches/pins use a gentle bounce ease (`--ease-bounce`); live presence uses a **ping pulse** ring (green, expanding, fading). Entrances are subtle fades — no long decorative loops. Respect reduced-motion.
- **Hover/press:** buttons darken one step (coral-500→600) and lift; press scales down. Rows tint to `--surface-sunk`; the active conversation row tints `--brand-soft`.
- **Borders:** hairline warm neutrals (`--border-subtle/-default`). Inputs are wells with an inset shadow and a coral focus ring.
- **Transparency/blur:** used for the map floating chrome and bottom sheets (`backdrop-filter` blur), and the sticky translucent site nav.
- **Corner radii:** xs 6 · sm 10 · md 14 · lg 20 · xl 28 · 2xl 36 · full 999; bubble 22/6.

## Iconography
- **Set:** [Lucide](https://lucide.dev) — rounded, 2px stroke, which matches Rally's friendly geometry. Substituted because no brand icon set was provided (**flag**). Load the Lucide UMD script on any page, then use the **`Icon`** component (`<Icon name="map-pin" />`). Common glyphs: `map-pin`, `navigation`, `send`, `users`, `plus`, `search`, `bell`, `flag`, `mic`, `smile`, `chevron-*`.
- **No PNG/SVG icon assets** ship in `assets/` — icons are all Lucide via CDN.
- **Emoji** are not used as UI icons (only occasionally inside user chat text). Unicode glyphs are not used as icons.
- **Logo:** no logo was supplied. The wordmark is **type-based** — "Rally" in the display face, optionally locked up with the coral pin holding an "R". Do not treat the pin-R lockup as a final trademark; it is a placeholder mark for this from-scratch brand. See `guidelines/brand-wordmark.card.html`.

---

## Components
Reusable primitives on `window.RallyDesignSystem_84ab56`. Each has a `.jsx`, a `.d.ts` contract, and a `.prompt.md` usage note.

**Core** (`components/core/`): **Button**, **IconButton**, **Icon**, **Avatar** (with presence), **Badge**, **Chip**, **Card**, **Input**, **Switch**.

**Chat** (`components/chat/`): **ChatBubble** (signature message bubble), **ConversationRow**, **PresenceDot**.

**Location** (`components/location/`): **MapPin** (coral teardrop), **LocationTile** (shared-location card), **LivePill** (live-sharing status).

## UI kits
- `ui_kits/app/` — **Rally mobile app**: chat list, thread + composer, share-location sheet, live map, profile, and **Expenses** (income/expense summary grouped by category & by person, with a shareable receipt). Interactive click-through.
- `ui_kits/site/` — **Rally marketing site**: hero, features, privacy CTA, footer.

## Foundations (Design System tab cards)
- `guidelines/color-*` — coral, ping, ink, semantic/surfaces.
- `guidelines/type-*` — display, body, mono.
- `guidelines/spacing-scale`, `spacing-radii`, `elevation`.
- `guidelines/brand-*` — wordmark, pin motif, voice & tone.

## Tokens
`styles.css` (root) is the consumer entry point — an `@import` manifest only. It reaches: `tokens/fonts.css` (webfonts), `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.

## Intentional additions / substitutions
- **Fonts** substituted from Google Fonts (Bricolage Grotesque, Figtree, Space Mono) — no brand font files provided. They load via Google's CSS `@import`, so the compiler reports 0 self-hosted `@font-face`. **Ask user for licensed font files to self-host.**
- **Icons** substituted with Lucide (CDN) — no brand icon set provided.
- **Logo** intentionally not drawn — type-based wordmark used instead.

## Repository index
- `styles.css` — global entry (import manifest)
- `tokens/` — colors, typography, spacing, effects, fonts, base
- `components/{core,chat,location}/` — primitives (+ card HTML per dir)
- `ui_kits/{app,site}/` — full-product recreations
- `guidelines/` — foundation specimen cards
- `SKILL.md` — portable skill wrapper
- `readme.md` — this file
