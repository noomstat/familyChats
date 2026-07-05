import * as React from "react";

export interface MapPinProps {
  /** Avatar image inside the pin. */
  src?: string;
  /** Initials shown when no src/icon. */
  label?: string;
  /** Lucide icon name inside the pin (place pins). */
  icon?: string;
  /** Pin width in px (height is ~1.32×). @default 44 */
  size?: number;
  /** Teardrop fill. @default "var(--brand)" */
  color?: string;
  /** Add a pulsing green halo (live location). @default false */
  live?: boolean;
  style?: React.CSSProperties;
}

/** The coral teardrop map marker — Rally's most recognizable shape. */
export function MapPin(props: MapPinProps): JSX.Element;
