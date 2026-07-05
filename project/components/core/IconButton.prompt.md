**IconButton** — circular, icon-only control. Use in composers (attach, mic), nav bars, and toolbars. Always pass `aria-label`.

```jsx
<IconButton name="send" variant="primary" aria-label="Send" />
<IconButton name="navigation" variant="live" aria-label="Share location" />
<IconButton name="plus" variant="soft" aria-label="Add" />
```

Variants: `primary` (coral), `live` (green location), `soft` (sunk paper), `outline`, `ghost`. Sizes `sm | md | lg` — `md` (44px) meets touch-target minimum.
