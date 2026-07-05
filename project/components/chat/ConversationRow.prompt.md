**ConversationRow** — a single group or DM in the chat list. Composes Avatar + Badge + PresenceDot.

```jsx
<ConversationRow name="Trail Crew" preview="Mara: on my way, 5 min" time="14:32" unread={3} live members={6} />
<ConversationRow name="Dev" preview="see you there" time="Mon" active />
```

`live` adds the green avatar ring + pulsing dot. `members` shows a group-size badge. `active` highlights the selected row with coral-soft.
