import React from "react";

/**
 * Rally Chip — selectable/removable pill. Used for filters, place suggestions,
 * quick replies, and member tags.
 */
export function Chip({
  children,
  selected = false,
  leading = null,
  onRemove,
  onClick,
  tone = "neutral",
  style,
  ...rest
}) {
  const base = {
    neutral: { bg: "var(--surface-card)", fg: "var(--text-body)", bd: "var(--border-default)" },
    brand:   { bg: "var(--brand-soft)",   fg: "var(--coral-700)", bd: "var(--coral-200)" },
    live:    { bg: "var(--live-soft)",    fg: "var(--ping-700)",  bd: "var(--ping-200)" },
  }[tone] || { bg: "var(--surface-card)", fg: "var(--text-body)", bd: "var(--border-default)" };

  const sel = selected
    ? { background: "var(--ink-900)", color: "var(--white)", borderColor: "var(--ink-900)" }
    : { background: base.bg, color: base.fg, borderColor: base.bd };

  return (
    <span
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 12px",
        borderRadius: "var(--radius-full)",
        border: "1px solid",
        fontFamily: "var(--font-body)",
        fontWeight: "var(--fw-medium)",
        fontSize: "var(--fs-body-sm)",
        cursor: onClick ? "pointer" : "default",
        transition: "background var(--dur-fast), border-color var(--dur-fast)",
        whiteSpace: "nowrap",
        ...sel,
        ...style,
      }}
      {...rest}
    >
      {leading}
      {children}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
          style={{ display: "inline-flex", marginRight: -4, marginLeft: 2, opacity: 0.6, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
        >×</span>
      )}
    </span>
  );
}
