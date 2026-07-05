import * as React from "react";

export interface LocationTileProps {
  /** Place / person label. @default "Shared location" */
  label?: string;
  /** Secondary meta line (mono), e.g. "0.4 mi · 6 min walk". */
  meta?: string;
  /** Avatar image for a person pin. Omit for a place icon. */
  pinSrc?: string;
  /** Lucide icon for place pins. @default "map-pin" */
  pinIcon?: string;
  /** Pulsing green halo — live location. @default false */
  live?: boolean;
  /** Map surface height in px. @default 132 */
  height?: number;
  /** Real map image URL; falls back to a stylized CSS map. */
  mapSrc?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Compact shared-place / shared-location card with a map surface, pin, and label bar.
 * @startingPoint section="Location" subtitle="Shared-location card" viewport="360x220"
 */
export function LocationTile(props: LocationTileProps): JSX.Element;
