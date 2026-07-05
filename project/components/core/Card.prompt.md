**Card** — Rally's base surface. White, 20px radius, warm soft shadow. Wrap grouped content, location tiles, settings blocks.

```jsx
<Card padding="lg">…</Card>
<Card interactive elevation="sm" onClick={open}>…</Card>
```

`interactive` adds a hover lift. Keep radius and shadow from tokens — don't restyle borders per-instance.
