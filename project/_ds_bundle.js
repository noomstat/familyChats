/* @ds-bundle: {"format":4,"namespace":"RallyDesignSystem_84ab56","components":[{"name":"ChatBubble","sourcePath":"components/chat/ChatBubble.jsx"},{"name":"ConversationRow","sourcePath":"components/chat/ConversationRow.jsx"},{"name":"PresenceDot","sourcePath":"components/chat/PresenceDot.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"LivePill","sourcePath":"components/location/LivePill.jsx"},{"name":"LocationTile","sourcePath":"components/location/LocationTile.jsx"},{"name":"MapPin","sourcePath":"components/location/MapPin.jsx"}],"sourceHashes":{"components/chat/ChatBubble.jsx":"a155176dc814","components/chat/ConversationRow.jsx":"45e115f8143d","components/chat/PresenceDot.jsx":"a137d23ecddc","components/core/Avatar.jsx":"ac8ff295172c","components/core/Badge.jsx":"c99a1b868485","components/core/Button.jsx":"dd3884896025","components/core/Card.jsx":"493ceed4a1b5","components/core/Chip.jsx":"3e9389607c3e","components/core/Icon.jsx":"312685f873a9","components/core/IconButton.jsx":"ce33c7f8ee93","components/core/Input.jsx":"cf2a24a4ce10","components/core/Switch.jsx":"083423fa6a5b","components/location/LivePill.jsx":"6654223b0035","components/location/LocationTile.jsx":"ab8cdba14e65","components/location/MapPin.jsx":"d57835cfd171","ui_kits/app/expenses.jsx":"c0af35f5972c","ui_kits/app/screens.jsx":"3e69f9e60afe","ui_kits/app/screens2.jsx":"483da11e641e","ui_kits/site/site.jsx":"2e263c8c1813"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RallyDesignSystem_84ab56 = window.RallyDesignSystem_84ab56 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/chat/ChatBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally ChatBubble — the signature message bubble.
 * `mine` = coral, right-aligned, tucked bottom-right corner.
 * others = white, left-aligned, tucked bottom-left corner.
 */
function ChatBubble({
  children,
  mine = false,
  author,
  time,
  showTail = true,
  attachment = null,
  // node rendered above text (e.g. a LocationTile)
  style,
  ...rest
}) {
  const bg = mine ? "var(--bubble-me-bg)" : "var(--bubble-them-bg)";
  const fg = mine ? "var(--bubble-me-text)" : "var(--bubble-them-text)";
  const radius = mine ? `var(--radius-bubble) var(--radius-bubble) var(--radius-bubble-tuck) var(--radius-bubble)` : `var(--radius-bubble) var(--radius-bubble) var(--radius-bubble) var(--radius-bubble-tuck)`;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: mine ? "flex-end" : "flex-start",
      maxWidth: "78%",
      ...style
    }
  }, rest), author && !mine && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-caption)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-muted)",
      margin: "0 0 3px 12px"
    }
  }, author), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      color: fg,
      border: mine ? "1px solid transparent" : "1px solid var(--border-subtle)",
      borderRadius: showTail ? radius : "var(--radius-bubble)",
      boxShadow: "var(--shadow-bubble)",
      padding: attachment ? "6px 6px 4px" : "10px 15px",
      fontSize: "var(--fs-body-md)",
      lineHeight: "1.4"
    }
  }, attachment && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: children ? 6 : 0
    }
  }, attachment), children && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: attachment ? "2px 9px 6px" : 0
    }
  }, children)), time && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "10px",
      color: "var(--text-faint)",
      margin: mine ? "4px 8px 0 0" : "4px 0 0 12px"
    }
  }, time));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/chat/PresenceDot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally PresenceDot — pulsing status dot. `state="live"` pulses green.
 */
function PresenceDot({
  state = "online",
  size = 10,
  pulse = null,
  style,
  ...rest
}) {
  const colors = {
    live: "var(--ping-500)",
    online: "var(--ping-500)",
    away: "var(--amber-500)",
    offline: "var(--ink-300)"
  };
  const c = colors[state] || colors.offline;
  const doPulse = pulse ?? state === "live";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex",
      width: size,
      height: size,
      ...style
    }
  }, rest), doPulse && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "var(--radius-full)",
      background: c,
      opacity: 0.45,
      animation: "rally-ping 1.6s var(--ease-out) infinite"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      background: c,
      position: "relative"
    }
  }), /*#__PURE__*/React.createElement("style", null, `@keyframes rally-ping{0%{transform:scale(1);opacity:.45}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}`));
}
Object.assign(__ds_scope, { PresenceDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/PresenceDot.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PRESENCE = {
  live: "var(--ping-500)",
  online: "var(--ping-500)",
  away: "var(--amber-500)",
  offline: "var(--ink-300)"
};

/**
 * Rally Avatar — round user image or initials, with optional presence ring/dot.
 * `presence="live"` adds a green ring (sharing location right now).
 */
function Avatar({
  src,
  name = "",
  size = 40,
  presence = null,
  // "live" | "online" | "away" | "offline"
  ring = false,
  // draw a colored ring (auto true when presence==="live")
  color,
  // background for initials fallback
  style,
  ...rest
}) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
  const bg = color || pickColor(name);
  const showRing = ring || presence === "live";
  const dotSize = Math.max(8, Math.round(size * 0.28));
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex",
      flex: "0 0 auto",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      overflow: "hidden",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      color: "var(--white)",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-bold)",
      fontSize: size * 0.4,
      letterSpacing: "-0.01em",
      boxShadow: showRing ? `0 0 0 2px var(--surface-card), 0 0 0 4px ${PRESENCE.live}` : "none",
      userSelect: "none"
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials || "?"), presence && presence !== "live" && /*#__PURE__*/React.createElement("span", {
    "aria-label": presence,
    style: {
      position: "absolute",
      right: -1,
      bottom: -1,
      width: dotSize,
      height: dotSize,
      borderRadius: "var(--radius-full)",
      background: PRESENCE[presence] || PRESENCE.offline,
      boxShadow: "0 0 0 2px var(--surface-card)"
    }
  }));
}
function pickColor(seed) {
  const palette = ["var(--coral-400)", "var(--ping-400)", "var(--sky-400)", "var(--amber-500)", "var(--coral-600)", "var(--ping-600)"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = h * 31 + seed.charCodeAt(i) >>> 0;
  return palette[h % palette.length];
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Badge — small status/count marker.
 */
function Badge({
  children,
  tone = "brand",
  size = "md",
  dot = false,
  style,
  ...rest
}) {
  const tones = {
    brand: {
      bg: "var(--brand)",
      fg: "var(--white)"
    },
    live: {
      bg: "var(--live)",
      fg: "var(--white)"
    },
    neutral: {
      bg: "var(--surface-sunk)",
      fg: "var(--text-body)"
    },
    info: {
      bg: "var(--info)",
      fg: "var(--white)"
    },
    warning: {
      bg: "var(--warning)",
      fg: "var(--ink-900)"
    },
    danger: {
      bg: "var(--danger)",
      fg: "var(--white)"
    }
  };
  const t = tones[tone] || tones.brand;
  const pad = size === "sm" ? "1px 7px" : "2px 9px";
  const fs = size === "sm" ? "var(--fs-micro)" : "var(--fs-caption)";
  if (dot) {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "var(--radius-full)",
        background: t.bg,
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/chat/ConversationRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally ConversationRow — a group/DM row in the chat list.
 */
function ConversationRow({
  name,
  preview,
  time,
  avatarSrc,
  unread = 0,
  live = false,
  // someone in this group is sharing location
  members = null,
  // number badge on avatar (group size)
  active = false,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: "var(--radius-md)",
      background: active ? "var(--brand-soft)" : "transparent",
      cursor: "pointer",
      transition: "background var(--dur-fast)",
      ...style
    },
    onMouseEnter: e => {
      if (!active) e.currentTarget.style.background = "var(--surface-sunk)";
    },
    onMouseLeave: e => {
      if (!active) e.currentTarget.style.background = "transparent";
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: avatarSrc,
    name: name,
    size: 46,
    presence: live ? "live" : null
  }), members != null && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: -3,
      bottom: -3,
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-full)",
      fontSize: 10,
      fontWeight: 700,
      color: "var(--text-muted)",
      padding: "1px 5px",
      fontFamily: "var(--font-mono)"
    }
  }, members)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-strong)",
      fontSize: "var(--fs-body-md)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, name), live && /*#__PURE__*/React.createElement(__ds_scope.PresenceDot, {
    state: "live",
    size: 8
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-body-sm)",
      color: unread ? "var(--text-body)" : "var(--text-muted)",
      fontWeight: unread ? "var(--fw-medium)" : "var(--fw-regular)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, preview))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 6,
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: unread ? "var(--brand)" : "var(--text-faint)"
    }
  }, time), unread > 0 && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "brand",
    size: "sm"
  }, unread)));
}
Object.assign(__ds_scope, { ConversationRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/ConversationRow.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Button — the primary action control.
 * Coral "signal" fill for primary; friendly rounded geometry.
 */
function Button({
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
    sm: {
      height: "var(--control-sm)",
      padding: "0 16px",
      fontSize: "var(--fs-body-sm)",
      gap: "6px",
      radius: "var(--radius-full)"
    },
    md: {
      height: "var(--control-md)",
      padding: "0 22px",
      fontSize: "var(--fs-body-md)",
      gap: "8px",
      radius: "var(--radius-full)"
    },
    lg: {
      height: "var(--control-lg)",
      padding: "0 30px",
      fontSize: "var(--fs-body-lg)",
      gap: "10px",
      radius: "var(--radius-full)"
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--text-on-brand)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-default)",
      boxShadow: "var(--shadow-xs)"
    },
    live: {
      background: "var(--live)",
      color: "var(--live-on)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-strong)",
      border: "1px solid transparent",
      boxShadow: "none"
    },
    danger: {
      background: "var(--danger)",
      color: "var(--white)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: {
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
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), leadingIcon, children, trailingIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Card — the base surface. White, softly rounded, warm shadow.
 */
function Card({
  children,
  padding = "lg",
  interactive = false,
  elevation = "sm",
  style,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "var(--space-4)",
    md: "var(--space-5)",
    lg: "var(--space-6)"
  };
  const shadows = {
    none: "none",
    xs: "var(--shadow-xs)",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      boxShadow: shadows[elevation] ?? shadows.sm,
      padding: pads[padding] ?? pads.lg,
      transition: interactive ? "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base)" : undefined,
      cursor: interactive ? "pointer" : undefined,
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "var(--shadow-md)";
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = shadows[elevation] ?? shadows.sm;
    } : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Chip — selectable/removable pill. Used for filters, place suggestions,
 * quick replies, and member tags.
 */
function Chip({
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
    neutral: {
      bg: "var(--surface-card)",
      fg: "var(--text-body)",
      bd: "var(--border-default)"
    },
    brand: {
      bg: "var(--brand-soft)",
      fg: "var(--coral-700)",
      bd: "var(--coral-200)"
    },
    live: {
      bg: "var(--live-soft)",
      fg: "var(--ping-700)",
      bd: "var(--ping-200)"
    }
  }[tone] || {
    bg: "var(--surface-card)",
    fg: "var(--text-body)",
    bd: "var(--border-default)"
  };
  const sel = selected ? {
    background: "var(--ink-900)",
    color: "var(--white)",
    borderColor: "var(--ink-900)"
  } : {
    background: base.bg,
    color: base.fg,
    borderColor: base.bd
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    role: onClick ? "button" : undefined,
    style: {
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
      ...style
    }
  }, rest), leading, children, onRemove && /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: "inline-flex",
      marginRight: -4,
      marginLeft: 2,
      opacity: 0.6,
      cursor: "pointer",
      fontSize: 16,
      lineHeight: 1
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Icon — thin wrapper over Lucide (the brand's icon set).
 * Consumers must load Lucide UMD once:
 *   <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
 * Renders an <i data-lucide> then asks Lucide to swap it for an inline SVG.
 */
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = "currentColor",
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || !window.lucide) return;
    // Reset then let Lucide render the SVG for this <i>
    el.innerHTML = "";
    const i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    el.appendChild(i);
    try {
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          "stroke-width": strokeWidth,
          stroke: color
        },
        nameAttr: "data-lucide"
      });
    } catch (e) {/* lucide not ready */}
  }, [name, size, strokeWidth, color]);
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    "aria-hidden": "true",
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      flex: "0 0 auto",
      color,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally IconButton — circular icon-only control (composer actions, nav).
 */
function IconButton({
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
  const dims = {
    sm: 34,
    md: 44,
    lg: 54
  }[size] || 44;
  const glyph = {
    sm: 16,
    md: 20,
    lg: 24
  }[size] || 20;
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--white)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    live: {
      background: "var(--live)",
      color: "var(--white)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    soft: {
      background: "var(--surface-sunk)",
      color: "var(--text-strong)",
      border: "1px solid transparent",
      boxShadow: "none"
    },
    outline: {
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-default)",
      boxShadow: "var(--shadow-xs)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent",
      boxShadow: "none"
    }
  };
  const v = variants[variant] || variants.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    style: {
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
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.92)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), icon || /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    size: glyph
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Input — text field with optional leading/trailing adornments.
 * Rounded well on paper; coral focus ring.
 */
function Input({
  value,
  defaultValue,
  placeholder,
  type = "text",
  leading = null,
  trailing = null,
  size = "md",
  invalid = false,
  disabled = false,
  onChange,
  style,
  inputStyle,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const h = {
    sm: "var(--control-sm)",
    md: "var(--control-md)",
    lg: "var(--control-lg)"
  }[size];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: h,
      padding: "0 14px",
      background: disabled ? "var(--surface-sunk)" : "var(--surface-card)",
      border: `1.5px solid ${invalid ? "var(--danger)" : focused ? "var(--brand)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-full)",
      boxShadow: focused ? invalid ? "0 0 0 3px var(--danger-soft)" : "var(--ring-brand)" : "var(--inset-well)",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
      opacity: disabled ? 0.6 : 1,
      ...style
    }
  }, leading && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--text-muted)"
    }
  }, leading), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    type: type,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-body)",
      fontSize: "var(--fs-body-md)",
      color: "var(--text-strong)",
      ...inputStyle
    }
  }, rest)), trailing && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--text-muted)"
    }
  }, trailing));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally Switch — toggle. Coral when on (or green for location toggles via tone="live").
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  tone = "brand",
  style,
  ...rest
}) {
  const onColor = tone === "live" ? "var(--live)" : "var(--brand)";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "var(--radius-full)",
      background: "var(--white)",
      boxShadow: "var(--shadow-sm)",
      transition: "transform var(--dur-base) var(--ease-bounce)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/location/LivePill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally LivePill — the "sharing live location" status pill with a pulsing dot.
 */
function LivePill({
  label = "Sharing live",
  timeLeft,
  onStop,
  compact = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.PresenceDot, {
    state: "live",
    size: 9
  }), /*#__PURE__*/React.createElement("span", null, label), timeLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--ping-600)",
      fontWeight: "var(--fw-regular)"
    }
  }, "\xB7 ", timeLeft), !compact && onStop && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onStop,
    "aria-label": "Stop sharing",
    style: {
      marginLeft: 2,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 24,
      borderRadius: "var(--radius-full)",
      border: "none",
      background: "var(--ping-500)",
      color: "var(--white)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 13,
    color: "var(--white)"
  })));
}
Object.assign(__ds_scope, { LivePill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/location/LivePill.jsx", error: String((e && e.message) || e) }); }

// components/location/MapPin.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally MapPin — the coral teardrop marker. Holds an avatar image, initials,
 * or an icon. This is the brand's most recognizable shape.
 */
function MapPin({
  src,
  label,
  // initials shown when no src/icon
  icon,
  // Lucide icon name
  size = 44,
  color = "var(--brand)",
  live = false,
  style,
  ...rest
}) {
  const inner = size - 8;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex",
      width: size,
      height: size * 1.32,
      ...style
    }
  }, rest), live && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: "50%",
      top: size / 2,
      transform: "translate(-50%,-50%)",
      width: size * 1.5,
      height: size * 1.5,
      borderRadius: "var(--radius-full)",
      background: "var(--ping-500)",
      opacity: 0.25,
      animation: "rally-pinpulse 1.8s var(--ease-out) infinite"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: size,
      height: size,
      background: color,
      borderRadius: "50% 50% 50% 0",
      transform: "rotate(45deg)",
      boxShadow: "var(--shadow-pin)",
      border: "3px solid var(--white)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
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
      fontSize: inner * 0.42
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: label || "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: inner * 0.55,
    color: "var(--white)"
  }) : label), /*#__PURE__*/React.createElement("style", null, `@keyframes rally-pinpulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.35}70%{transform:translate(-50%,-50%) scale(1.4);opacity:0}100%{opacity:0}}`));
}
Object.assign(__ds_scope, { MapPin });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/location/MapPin.jsx", error: String((e && e.message) || e) }); }

// components/location/LocationTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rally LocationTile — a compact shared-place / shared-location card.
 * Renders a stylized (non-interactive) map surface with a pin and a label bar.
 * Drop a real map <img>/<iframe> via `mapSrc` when you have one.
 */
function LocationTile({
  label = "Shared location",
  meta,
  // e.g. "0.4 mi · 6 min walk"
  pinSrc,
  // avatar inside pin (person) — else place icon
  pinIcon = "map-pin",
  live = false,
  height = 132,
  mapSrc = null,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      width: "100%",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      border: "1px solid var(--border-subtle)",
      background: "var(--surface-card)",
      cursor: onClick ? "pointer" : "default",
      boxShadow: "var(--shadow-xs)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height,
      background: "var(--map-bg)",
      overflow: "hidden"
    }
  }, mapSrc ? /*#__PURE__*/React.createElement("img", {
    src: mapSrc,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement(RallyMapArt, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: "48%",
      transform: "translate(-50%,-100%)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MapPin, {
    src: pinSrc,
    icon: pinSrc ? undefined : pinIcon,
    live: live,
    size: 38
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 30,
      height: 30,
      borderRadius: "var(--radius-full)",
      background: live ? "var(--live-soft)" : "var(--brand-soft)",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: live ? "navigation" : "map-pin",
    size: 16,
    color: live ? "var(--ping-600)" : "var(--coral-600)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-strong)",
      fontSize: "var(--fs-body-sm)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, label), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, meta)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-faint)"
  })));
}

/** Stylized map backdrop built from CSS gradients (no external tiles). */
function RallyMapArt() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 0,
      top: 0,
      width: "38%",
      height: "100%",
      background: "var(--map-water)",
      opacity: 0.9
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "6%",
      bottom: "8%",
      width: "34%",
      height: "44%",
      background: "var(--ping-100)",
      borderRadius: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "46%",
      width: "100%",
      height: 8,
      background: "var(--map-road)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "52%",
      top: 0,
      width: 8,
      height: "100%",
      background: "var(--map-road)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "20%",
      width: "70%",
      height: 5,
      background: "var(--map-road)",
      transform: "rotate(-8deg)",
      transformOrigin: "left"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      boxShadow: "var(--inset-well)"
    }
  }));
}
Object.assign(__ds_scope, { LocationTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/location/LocationTile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/expenses.jsx
try { (() => {
/* Rally — Expenses feature.
   Group income/expense summary, grouped by category and by person, + shareable receipt.
   Composes design-system primitives from window.RallyDesignSystem_84ab56. */

const REX = window.RallyDesignSystem_84ab56;
const {
  Button: EB,
  IconButton: EIB,
  Icon: EI,
  Avatar: EA,
  Badge: EBg,
  Chip: ECh,
  Card: ECard
} = REX;
const money = n => (n < 0 ? "-" : "") + "THB " + Math.abs(n).toFixed(2);

/* ---- fake data: a weekend trip's shared ledger ---- */
const CATEGORIES = [{
  id: "food",
  label: "Food & drink",
  icon: "utensils",
  amount: 268.40,
  color: "var(--coral-500)"
}, {
  id: "stay",
  label: "Stays",
  icon: "bed-double",
  amount: 220.00,
  color: "var(--coral-400)"
}, {
  id: "trans",
  label: "Transport",
  icon: "car",
  amount: 84.00,
  color: "var(--amber-500)"
}, {
  id: "gear",
  label: "Gear",
  icon: "backpack",
  amount: 40.00,
  color: "var(--sky-500)"
}];
const INCOME = {
  label: "Refunds & paid back",
  icon: "corner-down-left",
  amount: 80.00
};
const PEOPLE = [{
  name: "You Now",
  paid: 322.40,
  share: 153.10
}, {
  name: "Mara Ito",
  paid: 168.00,
  share: 153.10
}, {
  name: "Dev Kaur",
  paid: 122.00,
  share: 153.10
}, {
  name: "Sam Ng",
  paid: 0.00,
  share: 153.10
}];
const TOTAL = CATEGORIES.reduce((s, c) => s + c.amount, 0); // 612.40
const YOU = PEOPLE[0];

/* ---- Shared receipt data ---- */
const RECEIPT = {
  merchant: "Trailhead Diner",
  date: "SAT 14:52",
  paidBy: "You",
  category: "Food & drink",
  items: [["Big breakfast x4", 52.00], ["Cold brew x4", 18.00], ["Trail sandwiches x6", 42.00], ["Tax & tip", 16.40]],
  total: 128.40
};

/* =========================================================== */
function ExpensesScreen({
  onBack
}) {
  const [view, setView] = React.useState("category"); // category | people
  const [receipt, setReceipt] = React.useState(false);
  const net = YOU.paid - YOU.share; // +owed / -owes

  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "2px 10px 10px"
    }
  }, /*#__PURE__*/React.createElement(EIB, {
    name: "chevron-left",
    variant: "ghost",
    "aria-label": "Back",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 20,
      color: "var(--text-strong)",
      lineHeight: 1.1
    }
  }, "Expenses"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Trail Crew \xB7 4 people")), /*#__PURE__*/React.createElement(EIB, {
    name: "share-2",
    variant: "soft",
    "aria-label": "Share receipt",
    onClick: () => setReceipt(true)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 16px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--ink-900)",
      borderRadius: "var(--radius-xl)",
      padding: "18px 20px",
      color: "#fff",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      color: "var(--ping-300)"
    }
  }, "You're owed"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 42,
      letterSpacing: "-.02em",
      margin: "2px 0 12px"
    }
  }, money(net)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(MiniStat, {
    label: "You paid",
    value: money(YOU.paid),
    tone: "#fff"
  }), /*#__PURE__*/React.createElement(MiniStat, {
    label: "Your share",
    value: money(YOU.share),
    tone: "var(--ink-200)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      margin: "14px 0"
    }
  }, /*#__PURE__*/React.createElement(TotalCard, {
    icon: "arrow-down-left",
    label: "Expenses",
    value: money(TOTAL),
    color: "var(--coral-600)",
    bg: "var(--brand-soft)"
  }), /*#__PURE__*/React.createElement(TotalCard, {
    icon: "arrow-up-right",
    label: "Income",
    value: money(INCOME.amount),
    color: "var(--ping-700)",
    bg: "var(--live-soft)"
  })), /*#__PURE__*/React.createElement(Segmented, {
    value: view,
    onChange: setView,
    options: [["category", "By category"], ["people", "By people"]]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, view === "category" ? /*#__PURE__*/React.createElement(ByCategory, null) : /*#__PURE__*/React.createElement(ByPeople, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      gap: 10,
      padding: "10px 16px 24px",
      background: "var(--surface-card)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(EB, {
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(EI, {
      name: "receipt",
      size: 17
    }),
    onClick: () => setReceipt(true)
  }, "Receipt"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(EB, {
    block: true,
    leadingIcon: /*#__PURE__*/React.createElement(EI, {
      name: "plus",
      size: 18,
      color: "#fff"
    })
  }, "Add expense"))), receipt && /*#__PURE__*/React.createElement(ReceiptSheet, {
    onClose: () => setReceipt(false)
  }));
}
function MiniStat({
  label,
  value,
  tone
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "rgba(255,255,255,.08)",
      borderRadius: "var(--radius-md)",
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink-300)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 15,
      fontWeight: 700,
      color: tone
    }
  }, value));
}
function TotalCard({
  icon,
  label,
  value,
  color,
  bg
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: bg,
      borderRadius: "var(--radius-lg)",
      padding: "12px 14px",
      border: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      color,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(EI, {
    name: icon,
    size: 15,
    color: color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 20,
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, value));
}
function Segmented({
  value,
  onChange,
  options
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      background: "var(--surface-sunk)",
      borderRadius: "var(--radius-full)",
      padding: 4
    }
  }, options.map(([id, label]) => {
    const on = value === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onChange(id),
      style: {
        flex: 1,
        height: 36,
        border: "none",
        borderRadius: "var(--radius-full)",
        cursor: "pointer",
        background: on ? "var(--surface-card)" : "transparent",
        boxShadow: on ? "var(--shadow-sm)" : "none",
        color: on ? "var(--text-strong)" : "var(--text-muted)",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 14,
        transition: "all var(--dur-fast)"
      }
    }, label);
  }));
}
function ByCategory() {
  const max = Math.max(...CATEGORIES.map(c => c.amount));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, CATEGORIES.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      padding: "10px 4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 38,
      height: 38,
      borderRadius: "var(--radius-full)",
      background: "var(--surface-sunk)",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(EI, {
    name: c.icon,
    size: 19,
    color: c.color
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--text-strong)",
      fontSize: 15
    }
  }, c.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-strong)"
    }
  }, money(c.amount))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 99,
      background: "var(--surface-sunk)",
      marginTop: 7,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: c.amount / max * 100 + "%",
      background: c.color,
      borderRadius: 99
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 4px",
      marginTop: 4,
      borderTop: "1px dashed var(--border-default)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 38,
      height: 38,
      borderRadius: "var(--radius-full)",
      background: "var(--live-soft)",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement(EI, {
    name: INCOME.icon,
    size: 19,
    color: "var(--ping-600)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontWeight: 600,
      color: "var(--text-strong)",
      fontSize: 15
    }
  }, INCOME.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 15,
      color: "var(--ping-700)"
    }
  }, "+", money(INCOME.amount))));
}
function ByPeople() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, PEOPLE.map(p => {
    const net = p.paid - p.share; // + owed, - owes
    const isYou = p.name === "You Now";
    return /*#__PURE__*/React.createElement("div", {
      key: p.name,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 4px"
      }
    }, /*#__PURE__*/React.createElement(EA, {
      name: p.name,
      size: 42,
      presence: isYou ? null : "online",
      ring: isYou
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        color: "var(--text-strong)",
        fontSize: 15
      }
    }, isYou ? "You" : p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, "paid ", money(p.paid), " \xB7 share ", money(p.share))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 15,
        color: net >= 0 ? "var(--ping-700)" : "var(--coral-600)"
      }
    }, net >= 0 ? "+" : "", money(net)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--text-faint)"
      }
    }, net > 0 ? "owed" : net < 0 ? "owes" : "settled")), net < 0 && /*#__PURE__*/React.createElement(EB, {
      size: "sm",
      variant: "live"
    }, "Settle"));
  }));
}

/* ---- Shareable receipt bottom sheet ---- */
function ReceiptSheet({
  onClose
}) {
  const [shared, setShared] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(26,22,19,.45)",
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "flex-end",
      zIndex: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      background: "var(--surface-card)",
      borderRadius: "28px 28px 0 0",
      padding: "10px 20px 28px",
      boxShadow: "var(--shadow-xl)",
      maxHeight: "88%",
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 99,
      background: "var(--border-strong)",
      margin: "0 auto 16px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--paper)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      padding: "18px 18px 22px",
      boxShadow: "var(--inset-well)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 19,
      color: "var(--text-strong)"
    }
  }, RECEIPT.merchant), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, RECEIPT.date, " \xB7 paid by ", RECEIPT.paidBy)), /*#__PURE__*/React.createElement(EBg, {
    tone: "brand",
    size: "sm"
  }, RECEIPT.category)), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px dashed var(--border-strong)",
      paddingTop: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, RECEIPT.items.map(([label, amt]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, money(amt))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "2px solid var(--ink-900)",
      marginTop: 12,
      paddingTop: 10,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "var(--text-strong)",
      fontSize: 15
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      fontSize: 20,
      color: "var(--text-strong)"
    }
  }, money(RECEIPT.total))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTop: "1px dashed var(--border-strong)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginRight: 2
    }
  }, "Split among"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["You", "Mara", "Dev", "Sam"].map((n, i) => /*#__PURE__*/React.createElement("span", {
    key: n,
    style: {
      marginLeft: i ? -8 : 0,
      borderRadius: "50%",
      boxShadow: "0 0 0 2px var(--paper)"
    }
  }, /*#__PURE__*/React.createElement(EA, {
    name: n,
    size: 26
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-muted)",
      marginLeft: "auto"
    }
  }, money(RECEIPT.total / 4), "/person"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, shared ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 54,
      borderRadius: "var(--radius-full)",
      background: "var(--live-soft)",
      color: "var(--ping-700)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement(EI, {
    name: "check-circle-2",
    size: 20,
    color: "var(--ping-600)"
  }), " Shared to Trail Crew") : /*#__PURE__*/React.createElement(EB, {
    block: true,
    size: "lg",
    leadingIcon: /*#__PURE__*/React.createElement(EI, {
      name: "send",
      size: 18,
      color: "#fff"
    }),
    onClick: () => setShared(true)
  }, "Share to chat"))));
}
window.RallyExpenses = {
  ExpensesScreen,
  ReceiptSheet
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/expenses.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Rally mobile app — UI kit screens.
   Composes the design-system primitives from window.RallyDesignSystem_84ab56.
   Exports screens + a phone shell to window for index.html. */

const RDS = window.RallyDesignSystem_84ab56;
const {
  Button,
  IconButton,
  Icon,
  Avatar,
  Badge,
  Chip,
  Input,
  Switch,
  ChatBubble,
  ConversationRow,
  PresenceDot,
  MapPin,
  LivePill,
  LocationTile
} = RDS;

/* ---------- shared fake data ---------- */
const GROUPS = [{
  id: "trail",
  name: "Trail Crew",
  preview: "Mara: on my way, 5 min",
  time: "14:32",
  unread: 3,
  live: true,
  members: 6
}, {
  id: "climb",
  name: "Weekend Climb",
  preview: "Sam shared a location",
  time: "13:10",
  unread: 0,
  live: false,
  members: 4
}, {
  id: "dev",
  name: "Dev Kaur",
  preview: "see you there",
  time: "Mon",
  unread: 0,
  live: false,
  members: null
}, {
  id: "food",
  name: "Taco Tuesday",
  preview: "You: booking a table",
  time: "Sun",
  unread: 0,
  live: false,
  members: 5
}, {
  id: "fam",
  name: "Family",
  preview: "Mom: call me when free",
  time: "Sat",
  unread: 1,
  live: false,
  members: 4
}];

/* ---------- Phone shell ---------- */
function Phone({
  children,
  dark
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      borderRadius: 52,
      background: "#0d0b0a",
      padding: 12,
      boxShadow: "0 40px 90px rgba(46,33,24,.35)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      borderRadius: 42,
      overflow: "hidden",
      background: dark ? "var(--ink-900)" : "var(--surface-page)",
      position: "relative",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    dark: dark
  }), children), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 14,
      left: "50%",
      transform: "translateX(-50%)",
      width: 120,
      height: 30,
      background: "#0d0b0a",
      borderRadius: 20
    }
  }));
}
function StatusBar({
  dark
}) {
  const c = dark ? "#fff" : "var(--ink-900)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 50,
      flex: "0 0 auto",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: "0 26px 6px",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 700,
      color: c
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 15,
    color: c
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 15,
    color: c
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 17,
    color: c
  })));
}

/* ---------- Bottom nav ---------- */
function BottomNav({
  tab,
  onTab
}) {
  const items = [["chats", "message-circle", "Chats"], ["map", "map", "Map"], ["you", "user", "You"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "8px 0 26px",
      background: "var(--surface-card)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, items.map(([id, icon, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => onTab(id),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      color: tab === id ? "var(--brand)" : "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 23,
    color: tab === id ? "var(--brand)" : "var(--text-faint)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "var(--font-body)"
    }
  }, label))));
}

/* ---------- Screen: Conversation list ---------- */
function ChatListScreen({
  onOpen,
  onTab,
  tab
}) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const filters = ["All", "Live now", "Groups", "Unread"];
  let rows = GROUPS;
  if (filter === "Live now") rows = rows.filter(g => g.live);
  if (filter === "Groups") rows = rows.filter(g => g.members);
  if (filter === "Unread") rows = rows.filter(g => g.unread);
  if (q) rows = rows.filter(g => g.name.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      padding: "6px 16px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(PinMark, {
    size: 30
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: "-.03em",
      color: "var(--text-strong)"
    }
  }, "Rally")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    name: "bell",
    variant: "soft",
    size: "sm",
    "aria-label": "Notifications"
  }), /*#__PURE__*/React.createElement(IconButton, {
    name: "plus",
    variant: "primary",
    size: "sm",
    "aria-label": "New rally"
  }))), /*#__PURE__*/React.createElement(Input, {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Search groups & places",
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 12,
      overflowX: "auto"
    }
  }, filters.map(f => /*#__PURE__*/React.createElement(Chip, {
    key: f,
    selected: filter === f,
    onClick: () => setFilter(f)
  }, f)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 8px"
    }
  }, rows.map(g => /*#__PURE__*/React.createElement(ConversationRow, _extends({
    key: g.id
  }, g, {
    onClick: () => onOpen(g)
  }))), rows.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--text-faint)",
      padding: 40,
      fontSize: 14
    }
  }, "Nothing here yet")), /*#__PURE__*/React.createElement(BottomNav, {
    tab: tab,
    onTab: onTab
  }));
}

/* small pin mark for headers */
function PinMark({
  size = 30
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: size,
      height: size,
      display: "inline-block"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--coral-500)",
      borderRadius: "50% 50% 50% 0",
      transform: "rotate(45deg)",
      boxShadow: "var(--shadow-pin)",
      border: "2.5px solid #fff"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: size * 0.48
    }
  }, "R"));
}
window.RallyApp = {
  Phone,
  BottomNav,
  ChatListScreen,
  PinMark,
  GROUPS,
  RDS
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/screens2.jsx
try { (() => {
/* Rally mobile app — thread, share-location sheet, and live map screens. */

const RDS2 = window.RallyDesignSystem_84ab56;
const {
  Button: B2,
  IconButton: IB2,
  Icon: I2,
  Avatar: Av2,
  Badge: Bg2,
  Chip: Ch2,
  ChatBubble: CB,
  MapPin: MP,
  LivePill: LP,
  LocationTile: LT,
  PresenceDot: PD
} = RDS2;

/* ---------- Reusable stylized map surface ---------- */
function MapSurface({
  children,
  height = "100%"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      height,
      background: "var(--map-bg)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 0,
      top: 0,
      width: "34%",
      height: "60%",
      background: "var(--map-water)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "8%",
      bottom: "10%",
      width: "40%",
      height: "34%",
      background: "var(--ping-100)",
      borderRadius: 18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "44%",
      width: "100%",
      height: 12,
      background: "#fff"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "56%",
      top: 0,
      width: 12,
      height: "100%",
      background: "#fff"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "72%",
      width: "80%",
      height: 7,
      background: "#fff",
      transform: "rotate(-6deg)",
      transformOrigin: "left"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      boxShadow: "var(--inset-well)"
    }
  }), children);
}

/* ---------- Header ---------- */
function ThreadHeader({
  group,
  onBack,
  sharing
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "4px 12px 12px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(IB2, {
    name: "chevron-left",
    variant: "ghost",
    "aria-label": "Back",
    onClick: onBack
  }), /*#__PURE__*/React.createElement(Av2, {
    name: group.name,
    size: 40,
    presence: group.live ? "live" : null
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      color: "var(--text-strong)"
    }
  }, group.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, group.live ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PD, {
    state: "live",
    size: 7
  }), " 3 sharing live \xB7 ", group.members, " members") : /*#__PURE__*/React.createElement(React.Fragment, null, group.members ? group.members + " members" : "online"))), /*#__PURE__*/React.createElement(IB2, {
    name: "map",
    variant: "soft",
    "aria-label": "View map"
  }));
}

/* ---------- Screen: thread ---------- */
function ThreadScreen({
  group,
  onBack,
  onOpenMap
}) {
  const [msgs, setMsgs] = React.useState([{
    id: 1,
    author: "Mara",
    text: "who's actually coming today?"
  }, {
    id: 2,
    mine: true,
    text: "me! leaving now"
  }, {
    id: 3,
    author: "Dev",
    text: "same, 10 min out"
  }, {
    id: 4,
    mine: true,
    loc: {
      label: "The Fountain",
      meta: "0.4 mi · 6 min walk"
    },
    text: "meet here?"
  }, {
    id: 5,
    author: "Mara",
    text: "perfect 👌"
  }]);
  const [draft, setDraft] = React.useState("");
  const [sheet, setSheet] = React.useState(false);
  const [sharing, setSharing] = React.useState(group.live);
  const scroller = React.useRef(null);
  React.useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  });
  const send = () => {
    if (!draft.trim()) return;
    setMsgs(m => [...m, {
      id: Date.now(),
      mine: true,
      text: draft.trim()
    }]);
    setDraft("");
  };
  const confirmShare = dur => {
    setSharing(true);
    setSheet(false);
    setMsgs(m => [...m, {
      id: Date.now(),
      mine: true,
      live: true,
      loc: {
        label: "Your live location",
        meta: "Sharing · " + dur
      }
    }]);
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ThreadHeader, {
    group: {
      ...group,
      live: sharing
    },
    onBack: onBack
  }), sharing && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 14px",
      background: "var(--live-soft)",
      borderBottom: "1px solid var(--ping-200)"
    }
  }, /*#__PURE__*/React.createElement(LP, {
    timeLeft: "58 min left",
    compact: true
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSharing(false),
    style: {
      background: "none",
      border: "none",
      color: "var(--ping-700)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "Stop")), /*#__PURE__*/React.createElement("div", {
    ref: scroller,
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "16px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      background: "var(--surface-page)"
    }
  }, msgs.map(m => /*#__PURE__*/React.createElement(ChatMsg, {
    key: m.id,
    m: m,
    onOpenMap: onOpenMap
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px 24px",
      background: "var(--surface-card)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(IB2, {
    name: sharing ? "navigation" : "map-pin",
    variant: sharing ? "live" : "soft",
    "aria-label": "Share location",
    onClick: () => setSheet(true)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: draft,
    onChange: e => setDraft(e.target.value),
    placeholder: "Message",
    onKeyDown: e => {
      if (e.key === "Enter") send();
    },
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement(I2, {
      name: "smile",
      size: 19
    }))
  })), draft.trim() ? /*#__PURE__*/React.createElement(IB2, {
    name: "send",
    variant: "primary",
    "aria-label": "Send",
    onClick: send
  }) : /*#__PURE__*/React.createElement(IB2, {
    name: "mic",
    variant: "soft",
    "aria-label": "Voice"
  })), sheet && /*#__PURE__*/React.createElement(ShareSheet, {
    onClose: () => setSheet(false),
    onConfirm: confirmShare
  }));
}
function ChatMsg({
  m,
  onOpenMap
}) {
  const attachment = m.loc ? /*#__PURE__*/React.createElement(LT, {
    label: m.loc.label,
    meta: m.loc.meta,
    live: m.live,
    pinIcon: m.live ? "navigation" : "map-pin",
    height: 100,
    onClick: onOpenMap
  }) : null;
  return /*#__PURE__*/React.createElement(ChatBubble, {
    mine: m.mine,
    author: m.author,
    attachment: attachment
  }, m.text);
}

/* ---------- Bottom sheet: share duration ---------- */
function ShareSheet({
  onClose,
  onConfirm
}) {
  const opts = [["15 minutes", "15 min"], ["1 hour", "1 hr"], ["Until I stop", "until stopped"]];
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(26,22,19,.4)",
      backdropFilter: "blur(2px)",
      display: "flex",
      alignItems: "flex-end",
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      background: "var(--surface-card)",
      borderRadius: "28px 28px 0 0",
      padding: "10px 20px 30px",
      boxShadow: "var(--shadow-xl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 99,
      background: "var(--border-strong)",
      margin: "0 auto 16px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 20,
      color: "var(--text-strong)",
      marginBottom: 4
    }
  }, "Share live location"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Your group sees where you are until this ends. You can stop anytime."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, opts.map(([label, dur]) => /*#__PURE__*/React.createElement("button", {
    key: dur,
    onClick: () => onConfirm(dur),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-page)",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 16,
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, label, /*#__PURE__*/React.createElement(I2, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-faint)"
  }))))));
}

/* ---------- Screen: live map ---------- */
function MapScreen({
  onTab,
  tab
}) {
  const people = [{
    name: "Mara",
    left: "30%",
    top: "34%",
    live: true
  }, {
    name: "Dev",
    left: "62%",
    top: "50%",
    live: true
  }, {
    name: "You",
    left: "46%",
    top: "60%",
    live: true
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(MapSurface, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: "26%",
      transform: "translate(-50%,-100%)"
    }
  }, /*#__PURE__*/React.createElement(MP, {
    icon: "flag",
    color: "var(--ink-800)",
    size: 40
  })), people.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      position: "absolute",
      left: p.left,
      top: p.top,
      transform: "translate(-50%,-100%)"
    }
  }, /*#__PURE__*/React.createElement(MP, {
    label: p.name[0],
    live: p.live,
    size: 42
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      left: 14,
      right: 14,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-full)",
      boxShadow: "var(--shadow-md)",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(PD, {
    state: "live",
    size: 9
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-strong)",
      fontFamily: "var(--font-display)"
    }
  }, "Trail Crew"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "3 live"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 16,
      color: "var(--text-strong)"
    }
  }, "On the way"), /*#__PURE__*/React.createElement(LP, {
    timeLeft: "58 min",
    compact: true
  })), [["Mara Ito", "0.4 mi · 6 min", true], ["Dev Kaur", "1.1 mi · 14 min", true]].map(([n, meta]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 0"
    }
  }, /*#__PURE__*/React.createElement(Av2, {
    name: n,
    size: 38,
    presence: "live"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--text-strong)",
      fontSize: 15
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, meta)), /*#__PURE__*/React.createElement(IB2, {
    name: "navigation",
    variant: "outline",
    size: "sm",
    "aria-label": "Directions"
  }))))), window.RallyApp.BottomNav ? React.createElement(window.RallyApp.BottomNav, {
    tab,
    onTab
  }) : null);
}
window.RallyApp2 = {
  ThreadScreen,
  MapScreen,
  ShareSheet,
  MapSurface
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/screens2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/site.jsx
try { (() => {
/* Rally marketing site — landing page sections composed from DS primitives. */

const SITE = window.RallyDesignSystem_84ab56;
const {
  Button: SB,
  Icon: SI,
  Avatar: SA,
  Card: SC,
  Chip: SCh,
  MapPin: SMP,
  LivePill: SLP,
  LocationTile: SLT
} = SITE;
function PinLogo() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 26,
      height: 26,
      display: "inline-block"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--coral-500)",
      borderRadius: "50% 50% 50% 0",
      transform: "rotate(45deg)",
      boxShadow: "var(--shadow-pin)",
      border: "2px solid #fff"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 13
    }
  }, "R")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 22,
      letterSpacing: "-.03em",
      color: "var(--text-strong)"
    }
  }, "Rally"));
}
function Nav() {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 40px",
      background: "rgba(250,246,241,.8)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(PinLogo, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 30
    }
  }, ["Product", "Safety", "Pricing"].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: "var(--text-body)",
      fontWeight: 500,
      fontSize: 15,
      textDecoration: "none"
    }
  }, l)), /*#__PURE__*/React.createElement(SB, {
    size: "sm",
    leadingIcon: /*#__PURE__*/React.createElement(SI, {
      name: "apple",
      size: 15,
      color: "#fff"
    })
  }, "Get the app")));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.05fr .95fr",
      gap: 40,
      alignItems: "center",
      padding: "70px 40px 60px",
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "rally-eyebrow"
  }, "Group chat + live location"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 60,
      fontWeight: 800,
      lineHeight: 1.02,
      letterSpacing: "-.03em",
      margin: "16px 0 20px",
      color: "var(--text-strong)"
    }
  }, "Rally your people", /*#__PURE__*/React.createElement("br", null), "to the same place."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 19,
      lineHeight: 1.55,
      color: "var(--text-body)",
      maxWidth: 460,
      margin: "0 0 28px"
    }
  }, "One chat for the plan, one map for the moment. Drop a pin everyone can find, and share your live location for exactly as long as you choose \u2014 not a minute more."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(SB, {
    size: "lg",
    leadingIcon: /*#__PURE__*/React.createElement(SI, {
      name: "apple",
      size: 18,
      color: "#fff"
    })
  }, "Download for iOS"), /*#__PURE__*/React.createElement(SB, {
    size: "lg",
    variant: "secondary",
    leadingIcon: /*#__PURE__*/React.createElement(SI, {
      name: "play",
      size: 16
    })
  }, "Android")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["Mara", "Dev", "Sam", "Jo"].map((n, i) => /*#__PURE__*/React.createElement("span", {
    key: n,
    style: {
      marginLeft: i ? -10 : 0,
      borderRadius: "50%",
      boxShadow: "0 0 0 3px var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement(SA, {
    name: n,
    size: 34
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)"
    }
  }, "Loved by crews, climbers & families everywhere."))), /*#__PURE__*/React.createElement(HeroVisual, null));
}
function HeroVisual() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 440
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "var(--radius-2xl)",
      overflow: "hidden",
      boxShadow: "var(--shadow-xl)",
      background: "var(--map-bg)",
      border: "6px solid #fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 0,
      top: 0,
      width: "36%",
      height: "50%",
      background: "var(--map-water)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "8%",
      bottom: "8%",
      width: "42%",
      height: "38%",
      background: "var(--ping-100)",
      borderRadius: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "46%",
      width: "100%",
      height: 14,
      background: "#fff"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "54%",
      top: 0,
      width: 14,
      height: "100%",
      background: "#fff"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "26%",
      top: "30%",
      transform: "translate(-50%,-100%)"
    }
  }, /*#__PURE__*/React.createElement(SMP, {
    label: "M",
    live: true,
    size: 50
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "66%",
      top: "58%",
      transform: "translate(-50%,-100%)"
    }
  }, /*#__PURE__*/React.createElement(SMP, {
    label: "D",
    live: true,
    size: 50
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "44%",
      top: "72%",
      transform: "translate(-50%,-100%)"
    }
  }, /*#__PURE__*/React.createElement(SMP, {
    icon: "flag",
    color: "var(--ink-800)",
    size: 46
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 18,
      left: 18,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-full)",
      padding: 6,
      boxShadow: "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement(SLP, {
    timeLeft: "58 min left",
    compact: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: -18,
      right: -12,
      width: 230
    }
  }, /*#__PURE__*/React.createElement(SLT, {
    label: "The Fountain",
    meta: "0.4 mi \xB7 6 min walk",
    height: 92
  })));
}
const FEATURES = [["map-pin", "Drop a pin anyone can find", "Skip the “where are you?” texts. Set the spot once and the whole group gets walking directions."], ["navigation", "Live, on your terms", "Share your location for 15 minutes, an hour, or until you arrive. It ends on its own — you're never “always on.”"], ["users", "See who's on the way", "Watch your crew close in on the map, with ETAs, so you know whether to order or wait."]];
function Features() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "40px 40px 70px",
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 38,
      fontWeight: 800,
      letterSpacing: "-.02em",
      textAlign: "center",
      marginBottom: 40,
      color: "var(--text-strong)"
    }
  }, "Everything the group needs to actually show up."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 20
    }
  }, FEATURES.map(([ic, title, body], i) => /*#__PURE__*/React.createElement(SC, {
    key: title,
    padding: "lg"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 48,
      height: 48,
      borderRadius: 14,
      background: i === 1 ? "var(--live-soft)" : "var(--brand-soft)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(SI, {
    name: ic,
    size: 24,
    color: i === 1 ? "var(--ping-600)" : "var(--coral-600)"
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 21,
      fontWeight: 700,
      marginBottom: 8,
      color: "var(--text-strong)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.55,
      color: "var(--text-body)",
      margin: 0
    }
  }, body)))));
}
function SafetyCTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--ink-900)",
      color: "#fff",
      padding: "64px 40px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--ping-300)"
    }
  }, "Privacy by default"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-.02em",
      maxWidth: 720,
      margin: "16px auto 14px",
      color: "#fff"
    }
  }, "Location that turns itself off."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: "var(--ink-200)",
      maxWidth: 560,
      margin: "0 auto 28px",
      lineHeight: 1.55
    }
  }, "You choose who sees you and for how long. Sharing always expires, and you can stop it in one tap. No background tracking, ever."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(SB, {
    size: "lg"
  }, "Start a rally"), /*#__PURE__*/React.createElement(SB, {
    size: "lg",
    variant: "ghost",
    style: {
      color: "#fff",
      border: "1px solid rgba(255,255,255,.25)"
    }
  }, "Read our safety promise")));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: "40px",
      maxWidth: 1200,
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(PinLogo, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 26,
      fontSize: 14,
      color: "var(--text-muted)",
      flexWrap: "wrap"
    }
  }, ["Product", "Safety", "Pricing", "Support", "Privacy", "Terms"].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: "var(--text-muted)"
    }
  }, l))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-faint)"
    }
  }, "\xA9 2026 Rally"));
}
function Landing() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement(Nav, null), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(SafetyCTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.RallySite = {
  Landing
};
(function mount() {
  var el = document.getElementById("root");
  if (el && window.ReactDOM) ReactDOM.createRoot(el).render(/*#__PURE__*/React.createElement(Landing, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/site.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.ConversationRow = __ds_scope.ConversationRow;

__ds_ns.PresenceDot = __ds_scope.PresenceDot;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.LivePill = __ds_scope.LivePill;

__ds_ns.LocationTile = __ds_scope.LocationTile;

__ds_ns.MapPin = __ds_scope.MapPin;

})();
