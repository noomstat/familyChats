**LocationTile** — compact shared-location / shared-place card. Embed inside a ChatBubble `attachment`, or use standalone in lists. Falls back to a stylized CSS map when no `mapSrc`.

```jsx
<LocationTile label="The Fountain" meta="0.4 mi · 6 min walk" />
<LocationTile label="Mara" meta="Sharing live" pinSrc={photo} live />
```

Pass a real map image via `mapSrc` in production. Use `live` for a person actively sharing; omit for a static place.
