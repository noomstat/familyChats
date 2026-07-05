import React from "react";
import { Icon } from "../core/Icon.jsx";

/**
 * Rally MapPin — the coral teardrop marker. Holds an avatar image, initials,
 * or an icon. This is the brand's most recognizable shape.
 */
export function MapPin({
  src,
  label,          // initials shown when no src/icon
  icon,           // Lucide icon name
  size = 44,
  color = "var(--brand)",
  live = false,
  style,
  ...rest
}) {
  const inner = size - 8;
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size * 1.32, ...style }} {...rest}>
      {live && (
        <span style={{ position: "absolute", left: "50%", top: size / 2, transform: "translate(-50%,-50%)", width: size * 1.5, height: size * 1.5, borderRadius: "var(--radius-full)", background: "var(--ping-500)", opacity: 0.25, animation: "rally-pinpulse 1.8s var(--ease-out) infinite" }} />
      )}
      {/* teardrop */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          background: color,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(45deg)",
          boxShadow: "var(--shadow-pin)",
          border: "3px solid var(--white)",
        }}
      />
      {/* inner content (counter-rotated) */}
      <span
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: inner,
          height: inner,
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: src ? "var(--white)" : "rgba(255,255,255,0.18)",
          color: "var(--white)",
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-bold)",
          fontSize: inner * 0.42,
        }}
      >
        {src ? (
          <img src={src} alt={label || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : icon ? (
          <Icon name={icon} size={inner * 0.55} color="var(--white)" />
        ) : (
          label
        )}
      </span>
      <style>{`@keyframes rally-pinpulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.35}70%{transform:translate(-50%,-50%) scale(1.4);opacity:0}100%{opacity:0}}`}</style>
    </span>
  );
}
