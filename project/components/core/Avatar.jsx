import React from "react";

const PRESENCE = {
  live:  "var(--ping-500)",
  online:"var(--ping-500)",
  away:  "var(--amber-500)",
  offline:"var(--ink-300)",
};

/**
 * Rally Avatar — round user image or initials, with optional presence ring/dot.
 * `presence="live"` adds a green ring (sharing location right now).
 */
export function Avatar({
  src,
  name = "",
  size = 40,
  presence = null,      // "live" | "online" | "away" | "offline"
  ring = false,         // draw a colored ring (auto true when presence==="live")
  color,                // background for initials fallback
  style,
  ...rest
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const bg = color || pickColor(name);
  const showRing = ring || presence === "live";
  const dotSize = Math.max(8, Math.round(size * 0.28));

  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "0 0 auto", ...style }} {...rest}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          color: "var(--white)",
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-bold)",
          fontSize: size * 0.4,
          letterSpacing: "-0.01em",
          boxShadow: showRing ? `0 0 0 2px var(--surface-card), 0 0 0 4px ${PRESENCE.live}` : "none",
          userSelect: "none",
        }}
      >
        {src ? (
          <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials || "?"
        )}
      </span>
      {presence && presence !== "live" && (
        <span
          aria-label={presence}
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: "var(--radius-full)",
            background: PRESENCE[presence] || PRESENCE.offline,
            boxShadow: "0 0 0 2px var(--surface-card)",
          }}
        />
      )}
    </span>
  );
}

function pickColor(seed) {
  const palette = ["var(--coral-400)", "var(--ping-400)", "var(--sky-400)", "var(--amber-500)", "var(--coral-600)", "var(--ping-600)"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
