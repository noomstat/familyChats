import * as React from "react";

export interface IconProps {
  /** Lucide icon name, e.g. "map-pin", "send", "navigation", "users". */
  name: string;
  /** Pixel size (width & height). @default 20 */
  size?: number;
  /** @default 2 */
  strokeWidth?: number;
  /** @default "currentColor" */
  color?: string;
  style?: React.CSSProperties;
}

/** Rally's icon glyph — a wrapper over the Lucide icon set. */
export function Icon(props: IconProps): JSX.Element;
