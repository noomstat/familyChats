**LivePill** — status pill shown while a user shares live location. Pulsing green dot; optional countdown and stop button. Place in chat headers and the active-sharing banner.

```jsx
<LivePill timeLeft="12 min left" onStop={stop} />
<LivePill label="3 sharing" compact />
```

Always green (never coral) — this reads as "presence", not an action. Use `compact` inside dense rows.
