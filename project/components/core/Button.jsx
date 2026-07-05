import React from "react";

/**
 * Rally Button — the primary action control.
 * Coral "signal" fill for primary; friendly rounded geometry.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  onClick,
  type = "button",
  style,
  ...rest
}) {
  const sizes = {
    sm: { height: "var(--control-sm)", padding: "0 16px", fontSize: "var(--fs-body-sm)", gap: "6px", radius: "var(--radius-full)" },
    md: { height: "var(--control-md)", padding: "0 22px", fontSize: "var(--fs-body-md)", gap: "8px", radius: "var(--radius-full)" },
    lg: { height: "var(--control-lg)", padding: "0 30px", fontSize: "var(--fs-body-lg)", gap: "10px", radius: "var(--radius-full)" },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--text-on-brand)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)",
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-default)",
      boxShadow: "var(--shadow-xs)",
    },
    live: {
      background: "var(--live)",
      color: "var(--live-on)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-strong)",
      border: "1px solid transparent",
      boxShadow: "none",
    },
    danger: {
      background: "var(--danger)",
      color: "var(--white)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)",
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: block ? "flex" : "inline-flex",
        width: block ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontFamily: "var(--font-body)",
        fontWeight: "var(--fw-semibold)",
        fontSize: s.fontSize,
        lineHeight: 1,
        letterSpacing: "var(--ls-snug)",
        borderRadius: s.radius,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast), box-shadow var(--dur-fast)",
        whiteSpace: "nowrap",
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
