/* Rally mobile app — thread, share-location sheet, and live map screens. */

const RDS2 = window.RallyDesignSystem_84ab56;
const { Button: B2, IconButton: IB2, Icon: I2, Avatar: Av2, Badge: Bg2, Chip: Ch2,
        ChatBubble: CB, MapPin: MP, LivePill: LP, LocationTile: LT, PresenceDot: PD } = RDS2;

/* ---------- Reusable stylized map surface ---------- */
function MapSurface({ children, height = "100%" }) {
  return (
    <div style={{ position: "relative", width: "100%", height, background: "var(--map-bg)", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 0, top: 0, width: "34%", height: "60%", background: "var(--map-water)" }} />
      <div style={{ position: "absolute", left: "8%", bottom: "10%", width: "40%", height: "34%", background: "var(--ping-100)", borderRadius: 18 }} />
      <div style={{ position: "absolute", left: 0, top: "44%", width: "100%", height: 12, background: "#fff" }} />
      <div style={{ position: "absolute", left: "56%", top: 0, width: 12, height: "100%", background: "#fff" }} />
      <div style={{ position: "absolute", left: 0, top: "72%", width: "80%", height: 7, background: "#fff", transform: "rotate(-6deg)", transformOrigin: "left" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "var(--inset-well)" }} />
      {children}
    </div>
  );
}

/* ---------- Header ---------- */
function ThreadHeader({ group, onBack, sharing }) {
  return (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "4px 12px 12px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
      <IB2 name="chevron-left" variant="ghost" aria-label="Back" onClick={onBack} />
      <Av2 name={group.name} size={40} presence={group.live ? "live" : null} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-strong)" }}>{group.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
          {group.live
            ? (<><PD state="live" size={7} /> 3 sharing live · {group.members} members</>)
            : (<>{group.members ? group.members + " members" : "online"}</>)}
        </div>
      </div>
      <IB2 name="map" variant="soft" aria-label="View map" />
    </div>
  );
}

/* ---------- Screen: thread ---------- */
function ThreadScreen({ group, onBack, onOpenMap }) {
  const [msgs, setMsgs] = React.useState([
    { id: 1, author: "Mara", text: "who's actually coming today?" },
    { id: 2, mine: true, text: "me! leaving now" },
    { id: 3, author: "Dev", text: "same, 10 min out" },
    { id: 4, mine: true, loc: { label: "The Fountain", meta: "0.4 mi · 6 min walk" }, text: "meet here?" },
    { id: 5, author: "Mara", text: "perfect 👌" },
  ]);
  const [draft, setDraft] = React.useState("");
  const [sheet, setSheet] = React.useState(false);
  const [sharing, setSharing] = React.useState(group.live);
  const scroller = React.useRef(null);

  React.useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; });

  const send = () => {
    if (!draft.trim()) return;
    setMsgs(m => [...m, { id: Date.now(), mine: true, text: draft.trim() }]);
    setDraft("");
  };
  const confirmShare = (dur) => {
    setSharing(true); setSheet(false);
    setMsgs(m => [...m, { id: Date.now(), mine: true, live: true, loc: { label: "Your live location", meta: "Sharing · " + dur } }]);
  };

  return (
    <>
      <ThreadHeader group={{ ...group, live: sharing }} onBack={onBack} />
      {sharing && (
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "var(--live-soft)", borderBottom: "1px solid var(--ping-200)" }}>
          <LP timeLeft="58 min left" compact />
          <button onClick={() => setSharing(false)} style={{ background: "none", border: "none", color: "var(--ping-700)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>Stop</button>
        </div>
      )}
      <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-page)" }}>
        {msgs.map(m => (
          <ChatMsg key={m.id} m={m} onOpenMap={onOpenMap} />
        ))}
      </div>
      {/* composer */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 24px", background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)" }}>
        <IB2 name={sharing ? "navigation" : "map-pin"} variant={sharing ? "live" : "soft"} aria-label="Share location" onClick={() => setSheet(true)} />
        <div style={{ flex: 1 }}>
          <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Message"
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            trailing={<span style={{ display: "flex", gap: 2 }}><I2 name="smile" size={19} /></span>} />
        </div>
        {draft.trim()
          ? <IB2 name="send" variant="primary" aria-label="Send" onClick={send} />
          : <IB2 name="mic" variant="soft" aria-label="Voice" />}
      </div>
      {sheet && <ShareSheet onClose={() => setSheet(false)} onConfirm={confirmShare} />}
    </>
  );
}

function ChatMsg({ m, onOpenMap }) {
  const attachment = m.loc
    ? <LT label={m.loc.label} meta={m.loc.meta} live={m.live} pinIcon={m.live ? "navigation" : "map-pin"} height={100} onClick={onOpenMap} />
    : null;
  return <ChatBubble mine={m.mine} author={m.author} attachment={attachment}>{m.text}</ChatBubble>;
}

/* ---------- Bottom sheet: share duration ---------- */
function ShareSheet({ onClose, onConfirm }) {
  const opts = [["15 minutes", "15 min"], ["1 hour", "1 hr"], ["Until I stop", "until stopped"]];
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,22,19,.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "var(--surface-card)", borderRadius: "28px 28px 0 0", padding: "10px 20px 30px", boxShadow: "var(--shadow-xl)" }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--border-strong)", margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-strong)", marginBottom: 4 }}>Share live location</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>Your group sees where you are until this ends. You can stop anytime.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opts.map(([label, dur]) => (
            <button key={dur} onClick={() => onConfirm(dur)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-page)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text-strong)" }}>
              {label}<I2 name="chevron-right" size={18} color="var(--text-faint)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Screen: live map ---------- */
function MapScreen({ onTab, tab }) {
  const people = [
    { name: "Mara", left: "30%", top: "34%", live: true },
    { name: "Dev", left: "62%", top: "50%", live: true },
    { name: "You", left: "46%", top: "60%", live: true },
  ];
  return (
    <>
      <div style={{ flex: 1, position: "relative" }}>
        <MapSurface>
          <div style={{ position: "absolute", left: "50%", top: "26%", transform: "translate(-50%,-100%)" }}>
            <MP icon="flag" color="var(--ink-800)" size={40} />
          </div>
          {people.map(p => (
            <div key={p.name} style={{ position: "absolute", left: p.left, top: p.top, transform: "translate(-50%,-100%)" }}>
              <MP label={p.name[0]} live={p.live} size={42} />
            </div>
          ))}
        </MapSurface>
        {/* floating header */}
        <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, background: "var(--surface-card)", borderRadius: "var(--radius-full)", boxShadow: "var(--shadow-md)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <PD state="live" size={9} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-strong)", fontFamily: "var(--font-display)" }}>Trail Crew</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>3 live</span>
          </div>
        </div>
        {/* bottom sheet of who's live */}
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, background: "var(--surface-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-strong)" }}>On the way</span>
            <LP timeLeft="58 min" compact />
          </div>
          {[["Mara Ito", "0.4 mi · 6 min", true], ["Dev Kaur", "1.1 mi · 14 min", true]].map(([n, meta]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <Av2 name={n} size={38} presence="live" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>{n}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{meta}</div>
              </div>
              <IB2 name="navigation" variant="outline" size="sm" aria-label="Directions" />
            </div>
          ))}
        </div>
      </div>
      {window.RallyApp.BottomNav ? React.createElement(window.RallyApp.BottomNav, { tab, onTab }) : null}
    </>
  );
}

window.RallyApp2 = { ThreadScreen, MapScreen, ShareSheet, MapSurface };
