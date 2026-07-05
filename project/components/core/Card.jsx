import React from "react";

/**
 * Rally Card — the base surface. White, softly rounded, warm shadow.
 */
export function Card({
  children,
  padding = "lg",
  interactive = false,
  elevation = "sm",
  style,
  ...rest
}) {
  const pads = { none: 0, sm: "var(--space-4)", md: "var(--space-5)", lg: "var(--space-6)" };
  const shadows = { none: "none", xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };

  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: shadows[elevation] ?? shadows.sm,
        padding: pads[padding] ?? pads.lg,
        transition: interactive ? "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base)" : undefined,
        cursor: interactive ? "pointer" : undefined,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadows[elevation] ?? shadows.sm; } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
