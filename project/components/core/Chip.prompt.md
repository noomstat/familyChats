**Chip** — small selectable/removable pill. Use for filter rows, quick replies, place suggestions, and member tags.

```jsx
<Chip selected onClick={toggle}>All</Chip>
<Chip tone="live" leading={<Icon name="map-pin" size={14} />}>Nearby</Chip>
<Chip onRemove={remove}>Mara</Chip>
```

Selected chips fill dark ink. Unselected tone can be `neutral | brand | live`. Pair `onClick` for selection, `onRemove` for dismissible tags.
