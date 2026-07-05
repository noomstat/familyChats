# Rally — Marketing Site UI Kit

Single-page landing recreation for Rally, composed from the design-system primitives.

## Sections (`site.jsx`)
- **Nav** — pin wordmark, links, "Get the app" `Button`.
- **Hero** — eyebrow, display headline, subcopy, iOS/Android CTAs, avatar social proof, and a map-card visual with live `MapPin`s, a floating `LivePill`, and a `LocationTile`.
- **Features** — three `Card`s (drop a pin / live on your terms / see who's on the way).
- **Safety CTA** — dark ink band leaning on the privacy-first, auto-expiring-location message.
- **Footer** — wordmark, link columns, copyright.

## Notes
- All buttons, cards, pins, and pills are DS components on `window.RallyDesignSystem_84ab56`.
- Icons via [Lucide](https://lucide.dev) CDN. The hero map is a stylized CSS surface (swap for real tiles in production).
