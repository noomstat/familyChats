import React from "react";

/**
 * Rally ChatBubble — the signature message bubble.
 * `mine` = coral, right-aligned, tucked bottom-right corner.
 * others = white, left-aligned, tucked bottom-left corner.
 */
export function ChatBubble({
  children,
  mine = false,
  author,
  time,
  showTail = true,
  attachment = null,   // node rendered above text (e.g. a LocationTile)
  style,
  ...rest
}) {
  const bg = mine ? "var(--bubble-me-bg)" : "var(--bubble-them-bg)";
  const fg = mine ? "var(--bubble-me-text)" : "var(--bubble-them-text)";
  const radius = mine
    ? `var(--radius-bubble) var(--radius-bubble) var(--radius-bubble-tuck) var(--radius-bubble)`
    : `var(--radius-bubble) var(--radius-bubble) var(--radius-bubble) var(--radius-bubble-tuck)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", maxWidth: "78%", ...style }} {...rest}>
      {author && !mine && (
        <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-semibold)", color: "var(--text-muted)", margin: "0 0 3px 12px" }}>
          {author}
        </span>
      )}
      <div
        style={{
          background: bg,
          color: fg,
          border: mine ? "1px solid transparent" : "1px solid var(--border-subtle)",
          borderRadius: showTail ? radius : "var(--radius-bubble)",
          boxShadow: "var(--shadow-bubble)",
          padding: attachment ? "6px 6px 4px" : "10px 15px",
          fontSize: "var(--fs-body-md)",
          lineHeight: "1.4",
        }}
      >
        {attachment && <div style={{ marginBottom: children ? 6 : 0 }}>{attachment}</div>}
        {children && <div style={{ padding: attachment ? "2px 9px 6px" : 0 }}>{children}</div>}
      </div>
      {time && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-faint)", margin: mine ? "4px 8px 0 0" : "4px 0 0 12px" }}>
          {time}
        </span>
      )}
    </div>
  );
}
