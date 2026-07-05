import React from "react";
import { PresenceDot } from "../chat/PresenceDot.jsx";
import { Icon } from "../core/Icon.jsx";

/**
 * Rally LivePill — the "sharing live location" status pill with a pulsing dot.
 */
export function LivePill({ label = "Sharing live", timeLeft, onStop, compact = false, style, ...rest }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: compact ? 28 : 34,
        padding: compact ? "0 10px" : "0 6px 0 12px",
        borderRadius: "var(--radius-full)",
        background: "var(--live-soft)",
        border: "1px solid var(--ping-200)",
        color: "var(--ping-700)",
        fontFamily: "var(--font-body)",
        fontWeight: "var(--fw-semibold)",
        fontSize: "var(--fs-body-sm)",
        ...style,
      }}
      {...rest}
    >
      <PresenceDot state="live" size={9} />
      <span>{label}</span>
      {timeLeft && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ping-600)", fontWeight: "var(--fw-regular)" }}>
          · {timeLeft}
        </span>
      )}
      {!compact && onStop && (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop sharing"
          style={{ marginLeft: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "var(--radius-full)", border: "none", background: "var(--ping-500)", color: "var(--white)", cursor: "pointer" }}
        >
          <Icon name="x" size={13} color="var(--white)" />
        </button>
      )}
    </span>
  );
}
