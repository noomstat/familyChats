import React from "react";

/**
 * Rally Input — text field with optional leading/trailing adornments.
 * Rounded well on paper; coral focus ring.
 */
export function Input({
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
  const h = { sm: "var(--control-sm)", md: "var(--control-md)", lg: "var(--control-lg)" }[size];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: h,
        padding: "0 14px",
        background: disabled ? "var(--surface-sunk)" : "var(--surface-card)",
        border: `1.5px solid ${invalid ? "var(--danger)" : focused ? "var(--brand)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-full)",
        boxShadow: focused ? (invalid ? "0 0 0 3px var(--danger-soft)" : "var(--ring-brand)") : "var(--inset-well)",
        transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {leading && <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>{leading}</span>}
      <input
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-body-md)",
          color: "var(--text-strong)",
          ...inputStyle,
        }}
        {...rest}
      />
      {trailing && <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>{trailing}</span>}
    </div>
  );
}
