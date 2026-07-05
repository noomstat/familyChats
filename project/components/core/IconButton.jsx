import React from "react";
import { Icon } from "./Icon.jsx";

/**
 * Rally IconButton — circular icon-only control (composer actions, nav).
 */
export function IconButton({
  icon,
  name,
  variant = "ghost",
  size = "md",
  disabled = false,
  "aria-label": ariaLabel,
  onClick,
  style,
  ...rest
}) {
  const dims = { sm: 34, md: 44, lg: 54 }[size] || 44;
  const glyph = { sm: 16, md: 20, lg: 24 }[size] || 20;

  const variants = {
    primary: { background: "var(--brand)", color: "var(--white)", border: "1px solid transparent", boxShadow: "var(--shadow-sm)" },
    live:    { background: "var(--live)",  color: "var(--white)", border: "1px solid transparent", boxShadow: "var(--shadow-sm)" },
    soft:    { background: "var(--surface-sunk)", color: "var(--text-strong)", border: "1px solid transparent", boxShadow: "none" },
    outline: { background: "var(--surface-card)", color: "var(--text-strong)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)" },
    ghost:   { background: "transparent", color: "var(--text-body)", border: "1px solid transparent", boxShadow: "none" },
  };
  const v = variants[variant] || variants.ghost;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dims,
        height: dims,
        borderRadius: "var(--radius-full)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast)",
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.92)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {icon || <Icon name={name} size={glyph} />}
    </button>
  );
}
