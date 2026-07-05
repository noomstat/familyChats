/* Rally — Expenses feature.
   Group income/expense summary, grouped by category and by person, + shareable receipt.
   Composes design-system primitives from window.RallyDesignSystem_84ab56. */

const REX = window.RallyDesignSystem_84ab56;
const { Button: EB, IconButton: EIB, Icon: EI, Avatar: EA, Badge: EBg, Chip: ECh, Card: ECard } = REX;

const money = (n) => (n < 0 ? "-" : "") + "THB " + Math.abs(n).toFixed(2);

/* ---- fake data: a weekend trip's shared ledger ---- */
const CATEGORIES = [
  { id: "food",  label: "Food & drink", icon: "utensils",   amount: 268.40, color: "var(--coral-500)" },
  { id: "stay",  label: "Stays",        icon: "bed-double", amount: 220.00, color: "var(--coral-400)" },
  { id: "trans", label: "Transport",    icon: "car",        amount: 84.00,  color: "var(--amber-500)" },
  { id: "gear",  label: "Gear",         icon: "backpack",   amount: 40.00,  color: "var(--sky-500)" },
];
const INCOME = { label: "Refunds & paid back", icon: "corner-down-left", amount: 80.00 };

const PEOPLE = [
  { name: "You Now",  paid: 322.40, share: 153.10 },
  { name: "Mara Ito", paid: 168.00, share: 153.10 },
  { name: "Dev Kaur", paid: 122.00, share: 153.10 },
  { name: "Sam Ng",   paid: 0.00,   share: 153.10 },
];
const TOTAL = CATEGORIES.reduce((s, c) => s + c.amount, 0); // 612.40
const YOU = PEOPLE[0];

/* ---- Shared receipt data ---- */
const RECEIPT = {
  merchant: "Trailhead Diner",
  date: "SAT 14:52",
  paidBy: "You",
  category: "Food & drink",
  items: [
    ["Big breakfast x4", 52.00],
    ["Cold brew x4", 18.00],
    ["Trail sandwiches x6", 42.00],
    ["Tax & tip", 16.40],
  ],
  total: 128.40,
};

/* =========================================================== */
function ExpensesScreen({ onBack }) {
  const [view, setView] = React.useState("category"); // category | people
  const [receipt, setReceipt] = React.useState(false);
  const net = YOU.paid - YOU.share; // +owed / -owes

  return (
    <>
      {/* header */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "2px 10px 10px" }}>
        <EIB name="chevron-left" variant="ghost" aria-label="Back" onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-strong)", lineHeight: 1.1 }}>Expenses</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Trail Crew · 4 people</div>
        </div>
        <EIB name="share-2" variant="soft" aria-label="Share receipt" onClick={() => setReceipt(true)} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>
        {/* balance hero */}
        <div style={{ background: "var(--ink-900)", borderRadius: "var(--radius-xl)", padding: "18px 20px", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ping-300)" }}>You're owed</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 42, letterSpacing: "-.02em", margin: "2px 0 12px" }}>{money(net)}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <MiniStat label="You paid" value={money(YOU.paid)} tone="#fff" />
            <MiniStat label="Your share" value={money(YOU.share)} tone="var(--ink-200)" />
          </div>
        </div>

        {/* income / expense strip */}
        <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
          <TotalCard icon="arrow-down-left" label="Expenses" value={money(TOTAL)} color="var(--coral-600)" bg="var(--brand-soft)" />
          <TotalCard icon="arrow-up-right" label="Income" value={money(INCOME.amount)} color="var(--ping-700)" bg="var(--live-soft)" />
        </div>

        {/* segmented toggle */}
        <Segmented value={view} onChange={setView}
          options={[["category", "By category"], ["people", "By people"]]} />

        <div style={{ marginTop: 14 }}>
          {view === "category" ? <ByCategory /> : <ByPeople />}
        </div>
      </div>

      {/* actions */}
      <div style={{ flex: "0 0 auto", display: "flex", gap: 10, padding: "10px 16px 24px", background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)" }}>
        <EB variant="secondary" leadingIcon={<EI name="receipt" size={17} />} onClick={() => setReceipt(true)}>Receipt</EB>
        <div style={{ flex: 1 }}><EB block leadingIcon={<EI name="plus" size={18} color="#fff" />}>Add expense</EB></div>
      </div>

      {receipt && <ReceiptSheet onClose={() => setReceipt(false)} />}
    </>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,.08)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--ink-300)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}

function TotalCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: "var(--radius-lg)", padding: "12px 14px", border: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 4 }}>
        <EI name={icon} size={15} color={color} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>{value}</div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--surface-sunk)", borderRadius: "var(--radius-full)", padding: 4 }}>
      {options.map(([id, label]) => {
        const on = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            flex: 1, height: 36, border: "none", borderRadius: "var(--radius-full)", cursor: "pointer",
            background: on ? "var(--surface-card)" : "transparent",
            boxShadow: on ? "var(--shadow-sm)" : "none",
            color: on ? "var(--text-strong)" : "var(--text-muted)",
            fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14,
            transition: "all var(--dur-fast)",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

function ByCategory() {
  const max = Math.max(...CATEGORIES.map(c => c.amount));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {CATEGORIES.map(c => (
        <div key={c.id} style={{ padding: "10px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "inline-flex", width: 38, height: 38, borderRadius: "var(--radius-full)", background: "var(--surface-sunk)", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
              <EI name={c.icon} size={19} color={c.color} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>{c.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--text-strong)" }}>{money(c.amount)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--surface-sunk)", marginTop: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (c.amount / max * 100) + "%", background: c.color, borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
      {/* income row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", marginTop: 4, borderTop: "1px dashed var(--border-default)" }}>
        <span style={{ display: "inline-flex", width: 38, height: 38, borderRadius: "var(--radius-full)", background: "var(--live-soft)", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
          <EI name={INCOME.icon} size={19} color="var(--ping-600)" />
        </span>
        <span style={{ flex: 1, fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>{INCOME.label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--ping-700)" }}>+{money(INCOME.amount)}</span>
      </div>
    </div>
  );
}

function ByPeople() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {PEOPLE.map(p => {
        const net = p.paid - p.share; // + owed, - owes
        const isYou = p.name === "You Now";
        return (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px" }}>
            <EA name={p.name} size={42} presence={isYou ? null : "online"} ring={isYou} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>{isYou ? "You" : p.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>paid {money(p.paid)} · share {money(p.share)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: net >= 0 ? "var(--ping-700)" : "var(--coral-600)" }}>
                {net >= 0 ? "+" : ""}{money(net)}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{net > 0 ? "owed" : net < 0 ? "owes" : "settled"}</span>
            </div>
            {net < 0 && <EB size="sm" variant="live">Settle</EB>}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Shareable receipt bottom sheet ---- */
function ReceiptSheet({ onClose }) {
  const [shared, setShared] = React.useState(false);
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(26,22,19,.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", zIndex: 30 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "var(--surface-card)", borderRadius: "28px 28px 0 0", padding: "10px 20px 28px", boxShadow: "var(--shadow-xl)", maxHeight: "88%", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--border-strong)", margin: "0 auto 16px" }} />
        {/* receipt paper */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "18px 18px 22px", boxShadow: "var(--inset-well)", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, color: "var(--text-strong)" }}>{RECEIPT.merchant}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{RECEIPT.date} · paid by {RECEIPT.paidBy}</div>
            </div>
            <EBg tone="brand" size="sm">{RECEIPT.category}</EBg>
          </div>
          <div style={{ borderTop: "1px dashed var(--border-strong)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {RECEIPT.items.map(([label, amt]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text-body)" }}>
                <span>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{money(amt)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "2px solid var(--ink-900)", marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 700, color: "var(--text-strong)", fontSize: 15 }}>Total</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 20, color: "var(--text-strong)" }}>{money(RECEIPT.total)}</span>
          </div>
          {/* split-among row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border-strong)" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 2 }}>Split among</span>
            <div style={{ display: "flex" }}>
              {["You","Mara","Dev","Sam"].map((n,i)=>(
                <span key={n} style={{ marginLeft: i? -8:0, borderRadius:"50%", boxShadow:"0 0 0 2px var(--paper)" }}><EA name={n} size={26} /></span>
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{money(RECEIPT.total / 4)}/person</span>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {shared
            ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: "var(--radius-full)", background: "var(--live-soft)", color: "var(--ping-700)", fontWeight: 700 }}>
                <EI name="check-circle-2" size={20} color="var(--ping-600)" /> Shared to Trail Crew
              </div>
            : <EB block size="lg" leadingIcon={<EI name="send" size={18} color="#fff" />} onClick={() => setShared(true)}>Share to chat</EB>}
        </div>
      </div>
    </div>
  );
}

window.RallyExpenses = { ExpensesScreen, ReceiptSheet };
