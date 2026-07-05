/* Rally marketing site — landing page sections composed from DS primitives. */

const SITE = window.RallyDesignSystem_84ab56;
const { Button: SB, Icon: SI, Avatar: SA, Card: SC, Chip: SCh, MapPin: SMP, LivePill: SLP, LocationTile: SLT } = SITE;

function PinLogo() {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span style={{ position: "relative", width: 26, height: 26, display: "inline-block" }}>
        <span style={{ position: "absolute", inset: 0, background: "var(--coral-500)", borderRadius: "50% 50% 50% 0", transform: "rotate(45deg)", boxShadow: "var(--shadow-pin)", border: "2px solid #fff" }} />
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13 }}>R</span>
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-.03em", color: "var(--text-strong)" }}>Rally</span>
    </span>
  );
}

function Nav() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: "rgba(250,246,241,.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-subtle)" }}>
      <PinLogo />
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        {["Product", "Safety", "Pricing"].map(l => (
          <a key={l} href="#" style={{ color: "var(--text-body)", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>{l}</a>
        ))}
        <SB size="sm" leadingIcon={<SI name="apple" size={15} color="#fff" />}>Get the app</SB>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 40, alignItems: "center", padding: "70px 40px 60px", maxWidth: 1200, margin: "0 auto" }}>
      <div>
        <span className="rally-eyebrow">Group chat + live location</span>
        <h1 style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-.03em", margin: "16px 0 20px", color: "var(--text-strong)" }}>
          Rally your people<br />to the same place.
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.55, color: "var(--text-body)", maxWidth: 460, margin: "0 0 28px" }}>
          One chat for the plan, one map for the moment. Drop a pin everyone can find, and share your live location for exactly as long as you choose — not a minute more.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <SB size="lg" leadingIcon={<SI name="apple" size={18} color="#fff" />}>Download for iOS</SB>
          <SB size="lg" variant="secondary" leadingIcon={<SI name="play" size={16} />}>Android</SB>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 26 }}>
          <div style={{ display: "flex" }}>
            {["Mara","Dev","Sam","Jo"].map((n,i)=>(
              <span key={n} style={{ marginLeft: i? -10:0, borderRadius:"50%", boxShadow:"0 0 0 3px var(--surface-page)" }}><SA name={n} size={34} /></span>
            ))}
          </div>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Loved by crews, climbers &amp; families everywhere.</span>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}

function HeroVisual() {
  return (
    <div style={{ position: "relative", height: 440 }}>
      {/* map backdrop card */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "var(--radius-2xl)", overflow: "hidden", boxShadow: "var(--shadow-xl)", background: "var(--map-bg)", border: "6px solid #fff" }}>
        <div style={{ position: "absolute", right: 0, top: 0, width: "36%", height: "50%", background: "var(--map-water)" }} />
        <div style={{ position: "absolute", left: "8%", bottom: "8%", width: "42%", height: "38%", background: "var(--ping-100)", borderRadius: 24 }} />
        <div style={{ position: "absolute", left: 0, top: "46%", width: "100%", height: 14, background: "#fff" }} />
        <div style={{ position: "absolute", left: "54%", top: 0, width: 14, height: "100%", background: "#fff" }} />
        <div style={{ position: "absolute", left: "26%", top: "30%", transform: "translate(-50%,-100%)" }}><SMP label="M" live size={50} /></div>
        <div style={{ position: "absolute", left: "66%", top: "58%", transform: "translate(-50%,-100%)" }}><SMP label="D" live size={50} /></div>
        <div style={{ position: "absolute", left: "44%", top: "72%", transform: "translate(-50%,-100%)" }}><SMP icon="flag" color="var(--ink-800)" size={46} /></div>
      </div>
      {/* floating live pill */}
      <div style={{ position: "absolute", top: 18, left: 18, background: "var(--surface-card)", borderRadius: "var(--radius-full)", padding: 6, boxShadow: "var(--shadow-lg)" }}>
        <SLP timeLeft="58 min left" compact />
      </div>
      {/* floating location tile */}
      <div style={{ position: "absolute", bottom: -18, right: -12, width: 230 }}>
        <SLT label="The Fountain" meta="0.4 mi · 6 min walk" height={92} />
      </div>
    </div>
  );
}

const FEATURES = [
  ["map-pin", "Drop a pin anyone can find", "Skip the “where are you?” texts. Set the spot once and the whole group gets walking directions."],
  ["navigation", "Live, on your terms", "Share your location for 15 minutes, an hour, or until you arrive. It ends on its own — you're never “always on.”"],
  ["users", "See who's on the way", "Watch your crew close in on the map, with ETAs, so you know whether to order or wait."],
];

function Features() {
  return (
    <section style={{ padding: "40px 40px 70px", maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", marginBottom: 40, color: "var(--text-strong)" }}>Everything the group needs to actually show up.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {FEATURES.map(([ic, title, body], i) => (
          <SC key={title} padding="lg">
            <span style={{ display: "inline-flex", width: 48, height: 48, borderRadius: 14, background: i===1 ? "var(--live-soft)" : "var(--brand-soft)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <SI name={ic} size={24} color={i===1 ? "var(--ping-600)" : "var(--coral-600)"} />
            </span>
            <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 8, color: "var(--text-strong)" }}>{title}</h3>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--text-body)", margin: 0 }}>{body}</p>
          </SC>
        ))}
      </div>
    </section>
  );
}

function SafetyCTA() {
  return (
    <section style={{ background: "var(--ink-900)", color: "#fff", padding: "64px 40px", textAlign: "center" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ping-300)" }}>Privacy by default</span>
      <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em", maxWidth: 720, margin: "16px auto 14px", color: "#fff" }}>Location that turns itself off.</h2>
      <p style={{ fontSize: 18, color: "var(--ink-200)", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.55 }}>
        You choose who sees you and for how long. Sharing always expires, and you can stop it in one tap. No background tracking, ever.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <SB size="lg">Start a rally</SB>
        <SB size="lg" variant="ghost" style={{ color: "#fff", border: "1px solid rgba(255,255,255,.25)" }}>Read our safety promise</SB>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "40px", maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
      <PinLogo />
      <div style={{ display: "flex", gap: 26, fontSize: 14, color: "var(--text-muted)", flexWrap: "wrap" }}>
        {["Product", "Safety", "Pricing", "Support", "Privacy", "Terms"].map(l => <a key={l} href="#" style={{ color: "var(--text-muted)" }}>{l}</a>)}
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-faint)" }}>© 2026 Rally</span>
    </footer>
  );
}

function Landing() {
  return (
    <div style={{ background: "var(--surface-page)" }}>
      <Nav /><Hero /><Features /><SafetyCTA /><Footer />
    </div>
  );
}

window.RallySite = { Landing };

(function mount() {
  var el = document.getElementById("root");
  if (el && window.ReactDOM) ReactDOM.createRoot(el).render(<Landing />);
})();
