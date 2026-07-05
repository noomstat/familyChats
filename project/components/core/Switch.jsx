import React from "react";

/**
 * Rally Switch — toggle. Coral when on (or green for location toggles via tone="live").
 */
export function Switch({ checked = false, onChange, disabled = false, tone = "brand", style, ...rest }) {
  const onColor = tone === "live" ? "var(--live)" : "var(--brand)";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        flex: "0 0 auto",
        padding: 3,
        borderRadius: "var(--radius-full)",
        border: "none",
        background: checked ? onColor : "var(--ink-200)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--dur-base) var(--ease-out)",
        display: "flex",
        justifyContent: checked ? "flex-end" : "flex-start",
        alignItems: "center",
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "var(--radius-full)",
          background: "var(--white)",
          boxShadow: "var(--shadow-sm)",
          transition: "transform var(--dur-base) var(--ease-bounce)",
        }}
      />
    </button>
  );
}
