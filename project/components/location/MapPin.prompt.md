**MapPin** — the coral teardrop marker; Rally's signature shape. Holds an avatar (people), an icon (places), or initials.

```jsx
<MapPin src={photo} live />                    {/* a person sharing location */}
<MapPin icon="coffee" color="var(--info)" />   {/* a place */}
<MapPin label="R" />
```

`live` adds a pulsing green halo. Use avatar pins for people, icon pins for places. Don't recolor away from the semantic set (coral people / sky places).
