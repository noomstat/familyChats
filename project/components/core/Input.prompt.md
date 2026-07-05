**Input** — pill-shaped text field. Use for search, join-code, profile fields. The message composer uses its own component (ChatComposer pattern), not this.

```jsx
<Input placeholder="Search groups & places" leading={<Icon name="search" size={18} />} />
<Input placeholder="Group name" size="lg" />
<Input invalid placeholder="Join code" />
```

Focus ring is coral; `invalid` turns the ring/border red. Sizes `sm | md | lg`.
