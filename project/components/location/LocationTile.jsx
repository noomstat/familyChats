import React from "react";
import { MapPin } from "./MapPin.jsx";
import { Icon } from "../core/Icon.jsx";

/**
 * Rally LocationTile — a compact shared-place / shared-location card.
 * Renders a stylized (non-interactive) map surface with a pin and a label bar.
 * Drop a real map <img>/<iframe> via `mapSrc` when you have one.
 */
export function LocationTile({
  label = "Shared location",
  meta,                 // e.g. "0.4 mi · 6 min walk"
  pinSrc,               // avatar inside pin (person) — else place icon
  pinIcon = "map-pin",
  live = false,
  height = 132,
  mapSrc = null,
  onClick,
  style,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-card)",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "var(--shadow-xs)",
        ...style,
      }}
      {...rest}
    >
      {/* Map surface */}
      <div style={{ position: "relative", height, background: "var(--map-bg)", overflow: "hidden" }}>
        {mapSrc ? (
          <img src={mapSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <RallyMapArt />
        )}
        <div style={{ position: "absolute", left: "50%", top: "48%", transform: "translate(-50%,-100%)" }}>
          <MapPin src={pinSrc} icon={pinSrc ? undefined : pinIcon} live={live} size={38} />
        </div>
      </div>
      {/* Label bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface-card)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "var(--radius-full)", background: live ? "var(--live-soft)" : "var(--brand-soft)", flex: "0 0 auto" }}>
          <Icon name={live ? "navigation" : "map-pin"} size={16} color={live ? "var(--ping-600)" : "var(--coral-600)"} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", fontSize: "var(--fs-body-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          {meta && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{meta}</div>}
        </div>
        <Icon name="chevron-right" size={18} color="var(--text-faint)" />
      </div>
    </div>
  );
}

/** Stylized map backdrop built from CSS gradients (no external tiles). */
function RallyMapArt() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* water block */}
      <div style={{ position: "absolute", right: 0, top: 0, width: "38%", height: "100%", background: "var(--map-water)", opacity: 0.9 }} />
      {/* park block */}
      <div style={{ position: "absolute", left: "6%", bottom: "8%", width: "34%", height: "44%", background: "var(--ping-100)", borderRadius: 12 }} />
      {/* roads */}
      <div style={{ position: "absolute", left: 0, top: "46%", width: "100%", height: 8, background: "var(--map-road)" }} />
      <div style={{ position: "absolute", left: "52%", top: 0, width: 8, height: "100%", background: "var(--map-road)" }} />
      <div style={{ position: "absolute", left: 0, top: "20%", width: "70%", height: 5, background: "var(--map-road)", transform: "rotate(-8deg)", transformOrigin: "left" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "var(--inset-well)" }} />
    </div>
  );
}
