import * as React from "react";

export interface IconButtonProps {
  /** Lucide icon name (used if `icon` not supplied). */
  name?: string;
  /** Custom node instead of a named Lucide glyph. */
  icon?: React.ReactNode;
  /** @default "ghost" */
  variant?: "primary" | "live" | "soft" | "outline" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  "aria-label": string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/** Circular icon-only control for composer actions & navigation. */
export function IconButton(props: IconButtonProps): JSX.Element;
