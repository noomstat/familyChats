/* Rally mobile app — UI kit screens.
   Composes the design-system primitives from window.RallyDesignSystem_84ab56.
   Exports screens + a phone shell to window for index.html. */

const RDS = window.RallyDesignSystem_84ab56;
const { Button, IconButton, Icon, Avatar, Badge, Chip, Input, Switch,
        ChatBubble, ConversationRow, PresenceDot,
        MapPin, LivePill, LocationTile } = RDS;

/* ---------- shared fake data ---------- */
const GROUPS = [
  { id: "trail", name: "Trail Crew", preview: "Mara: on my way, 5 min", time: "14:32", unread: 3, live: true, members: 6 },
  { id: "climb", name: "Weekend Climb", preview: "Sam shared a location", time: "13:10", unread: 0, live: false, members: 4 },
  { id: "dev",   name: "Dev Kaur",     preview: "see you there", time: "Mon", unread: 0, live: false, members: null },
  { id: "food",  name: "Taco Tuesday", preview: "You: booking a table", time: "Sun", unread: 0, live: false, members: 5 },
  { id: "fam",   name: "Family",       preview: "Mom: call me when free", time: "Sat", unread: 1, live: false, members: 4 },
];

/* ---------- Phone shell ---------- */
function Phone({ children, dark }) {
  return (
    <div style={{ width: 390, height: 844, borderRadius: 52, background: "#0d0b0a", padding: 12, boxShadow: "0 40px 90px rgba(46,33,24,.35)", position: "relative" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 42, overflow: "hidden", background: dark ? "var(--ink-900)" : "var(--surface-page)", position: "relative", display: "flex", flexDirection: "column" }}>
        <StatusBar dark={dark} />
        {children}
      </div>
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 120, height: 30, background: "#0d0b0a", borderRadius: 20 }} />
    </div>
  );
}
function StatusBar({ dark }) {
  const c = dark ? "#fff" : "var(--ink-900)";
  return (
    <div style={{ height: 50, flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 26px 6px", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: c }}>
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Icon name="signal" size={15} color={c} /><Icon name="wifi" size={15} color={c} /><Icon name="battery-full" size={17} color={c} />
      </span>
    </div>
  );
}

/* ---------- Bottom nav ---------- */
function BottomNav({ tab, onTab }) {
  const items = [["chats","message-circle","Chats"],["map","map","Map"],["you","user","You"]];
  return (
    <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 0 26px", background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)" }}>
      {items.map(([id, icon, label]) => (
        <button key={id} onClick={() => onTab(id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === id ? "var(--brand)" : "var(--text-faint)" }}>
          <Icon name={icon} size={23} color={tab === id ? "var(--brand)" : "var(--text-faint)"} />
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-body)" }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Screen: Conversation list ---------- */
function ChatListScreen({ onOpen, onTab, tab }) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const filters = ["All", "Live now", "Groups", "Unread"];
  let rows = GROUPS;
  if (filter === "Live now") rows = rows.filter(g => g.live);
  if (filter === "Groups") rows = rows.filter(g => g.members);
  if (filter === "Unread") rows = rows.filter(g => g.unread);
  if (q) rows = rows.filter(g => g.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div style={{ flex: "0 0 auto", padding: "6px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <PinMark size={30} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-.03em", color: "var(--text-strong)" }}>Rally</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <IconButton name="bell" variant="soft" size="sm" aria-label="Notifications" />
            <IconButton name="plus" variant="primary" size="sm" aria-label="New rally" />
          </div>
        </div>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search groups & places" leading={<Icon name="search" size={18} />} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto" }}>
          {filters.map(f => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {rows.map(g => (
          <ConversationRow key={g.id} {...g} onClick={() => onOpen(g)} />
        ))}
        {rows.length === 0 && <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40, fontSize: 14 }}>Nothing here yet</div>}
      </div>
      <BottomNav tab={tab} onTab={onTab} />
    </>
  );
}

/* small pin mark for headers */
function PinMark({ size = 30 }) {
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <span style={{ position: "absolute", inset: 0, background: "var(--coral-500)", borderRadius: "50% 50% 50% 0", transform: "rotate(45deg)", boxShadow: "var(--shadow-pin)", border: "2.5px solid #fff" }} />
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.48 }}>R</span>
    </span>
  );
}

window.RallyApp = { Phone, BottomNav, ChatListScreen, PinMark, GROUPS, RDS };
