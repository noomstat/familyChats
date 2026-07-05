**PresenceDot** — standalone status dot. Pulses green when `state="live"` (actively sharing location). Use next to names, in headers, on map markers.

```jsx
<PresenceDot state="live" />
<PresenceDot state="away" size={8} />
```

Prefer this for inline text placement; use Avatar's built-in presence for avatars.
