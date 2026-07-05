**Avatar** — round user image or auto-initials, with presence. Use in conversation rows, message groups, and the member stack.

```jsx
<Avatar name="Mara Ito" presence="live" size={44} />   {/* green ring = sharing location */}
<Avatar src={photo} name="Dev" presence="away" />
<Avatar name="Group" size={32} />
```

`presence="live"` = green ring (actively sharing location). `online` / `away` / `offline` render a corner dot. Fallback color is derived deterministically from `name`.
