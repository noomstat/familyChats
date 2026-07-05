import React from "react";
import { Avatar } from "../core/Avatar.jsx";
import { Badge } from "../core/Badge.jsx";
import { PresenceDot } from "./PresenceDot.jsx";

/**
 * Rally ConversationRow — a group/DM row in the chat list.
 */
export function ConversationRow({
  name,
  preview,
  time,
  avatarSrc,
  unread = 0,
  live = false,          // someone in this group is sharing location
  members = null,        // number badge on avatar (group size)
  active = false,
  onClick,
  style,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        background: active ? "var(--brand-soft)" : "transparent",
        cursor: "pointer",
        transition: "background var(--dur-fast)",
        ...style,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface-sunk)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      {...rest}
    >
      <div style={{ position: "relative", flex: "0 0 auto" }}>
        <Avatar src={avatarSrc} name={name} size={46} presence={live ? "live" : null} />
        {members != null && (
          <span style={{ position: "absolute", right: -3, bottom: -3, background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", padding: "1px 5px", fontFamily: "var(--font-mono)" }}>
            {members}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", fontSize: "var(--fs-body-md)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          {live && <PresenceDot state="live" size={8} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: "var(--fs-body-sm)", color: unread ? "var(--text-body)" : "var(--text-muted)", fontWeight: unread ? "var(--fw-medium)" : "var(--fw-regular)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {preview}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "0 0 auto" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: unread ? "var(--brand)" : "var(--text-faint)" }}>{time}</span>
        {unread > 0 && <Badge tone="brand" size="sm">{unread}</Badge>}
      </div>
    </div>
  );
}
