**ChatBubble** — the signature Rally message bubble. `mine` bubbles are coral and right-aligned; incoming are white with the sender name above. Use `attachment` to embed a LocationTile or image.

```jsx
<ChatBubble author="Mara" time="14:32">on my way, 5 min</ChatBubble>
<ChatBubble mine time="14:33">meet at the fountain?</ChatBubble>
<ChatBubble mine attachment={<LocationTile label="The Fountain" />} time="14:34" />
```

One corner is tucked toward the tail. Timestamps render in mono. Keep max width ~78% of the thread.
