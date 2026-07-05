**Button** — Rally's primary action control; use for the main action in any view (Send, Rally the group, Share location).

```jsx
<Button variant="primary" size="md" onClick={rally}>Rally the group</Button>
<Button variant="live" leadingIcon={<Icon name="navigation" size={16} />}>Share live location</Button>
<Button variant="secondary">Not now</Button>
```

Variants: `primary` (coral), `secondary` (outlined on paper), `live` (mint green — location actions), `ghost` (bare), `danger`. Sizes `sm | md | lg`. All pill-shaped. Use `live` specifically for location-sharing actions so it reads as "presence", never as the default action.
