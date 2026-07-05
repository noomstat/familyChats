import React from "react";

/**
 * Rally Badge — small status/count marker.
 */
export function Badge({ children, tone = "brand", size = "md", dot = false, style, ...rest }) {
  const tones = {
    brand:   { bg: "var(--brand)",   fg: "var(--white)" },
    live:    { bg: "var(--live)",    fg: "var(--white)" },
    neutral: { bg: "var(--surface-sunk)", fg: "var(--text-body)" },
    info:    { bg: "var(--info)",    fg: "var(--white)" },
    warning: { bg: "var(--warning)", fg: "var(--ink-900)" },
    danger:  { bg: "var(--danger)",  fg: "var(--white)" },
  };
  const t = tones[tone] || tones.brand;
  const pad = size === "sm" ? "1px 7px" : "2px 9px";
  const fs = size === "sm" ? "var(--fs-micro)" : "var(--fs-caption)";

  if (dot) {
    return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "var(--radius-full)", background: t.bg, ...style }} {...rest} />;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: size === "sm" ? 18 : 20,
        padding: pad,
        borderRadius: "var(--radius-full)",
        background: t.bg,
        color: t.fg,
        fontFamily: "var(--font-body)",
        fontWeight: "var(--fw-bold)",
        fontSize: fs,
        lineHeight: 1.2,
        letterSpacing: "var(--ls-snug)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
