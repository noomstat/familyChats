import * as React from "react";

export interface AvatarProps {
  /** Image URL. Falls back to initials from `name`. */
  src?: string;
  /** Display name — used for initials + deterministic fallback color. */
  name?: string;
  /** Pixel diameter. @default 40 */
  size?: number;
  /** Presence state. "live" draws a green ring; others draw a corner dot. */
  presence?: "live" | "online" | "away" | "offline" | null;
  /** Force a colored ring even without live presence. @default false */
  ring?: boolean;
  /** Override the initials background color. */
  color?: string;
  style?: React.CSSProperties;
}

/** Round user avatar with initials fallback and presence indicator. */
export function Avatar(props: AvatarProps): JSX.Element;
