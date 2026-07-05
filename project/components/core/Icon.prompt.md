**Icon** — Rally uses [Lucide](https://lucide.dev) as its icon set (rounded 2px stroke, matches the friendly geometry). Load the Lucide UMD script once on the page, then use `name` = any Lucide id.

```jsx
<Icon name="map-pin" size={20} />
<Icon name="send" size={18} color="var(--brand)" />
```

Common Rally glyphs: `map-pin`, `navigation`, `send`, `users`, `plus`, `smile`, `mic`, `image`, `bell`, `search`, `compass`, `clock`. Inherits `currentColor` by default — set text color on the parent to tint it.
