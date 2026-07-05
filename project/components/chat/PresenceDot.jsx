import React from "react";

/**
 * Rally PresenceDot — pulsing status dot. `state="live"` pulses green.
 */
export function PresenceDot({ state = "online", size = 10, pulse = null, style, ...rest }) {
  const colors = {
    live:   "var(--ping-500)",
    online: "var(--ping-500)",
    away:   "var(--amber-500)",
    offline:"var(--ink-300)",
  };
  const c = colors[state] || colors.offline;
  const doPulse = pulse ?? state === "live";

  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, ...style }} {...rest}>
      {doPulse && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "var(--radius-full)",
            background: c,
            opacity: 0.45,
            animation: "rally-ping 1.6s var(--ease-out) infinite",
          }}
        />
      )}
      <span style={{ width: size, height: size, borderRadius: "var(--radius-full)", background: c, position: "relative" }} />
      <style>{`@keyframes rally-ping{0%{transform:scale(1);opacity:.45}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}`}</style>
    </span>
  );
}
