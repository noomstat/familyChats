import * as React from "react";

export interface BadgeProps {
  children?: React.ReactNode;
  /** @default "brand" */
  tone?: "brand" | "live" | "neutral" | "info" | "warning" | "danger";
  /** @default "md" */
  size?: "sm" | "md";
  /** Render as a bare status dot (ignores children). @default false */
  dot?: boolean;
  style?: React.CSSProperties;
}

/** Small count/status marker — unread counts, "LIVE", labels. */
export function Badge(props: BadgeProps): JSX.Element;
