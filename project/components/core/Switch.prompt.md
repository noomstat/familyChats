**Switch** — on/off toggle. Use `tone="live"` (green) for any location-sharing toggle so on = actively sharing.

```jsx
<Switch checked={notif} onChange={setNotif} />
<Switch checked={sharing} onChange={setSharing} tone="live" />
```

Coral when on by default; green for location toggles. Knob has a subtle bounce on toggle.
