import * as React from "react";

export interface PresenceDotProps {
  /** @default "online" */
  state?: "live" | "online" | "away" | "offline";
  /** Pixel diameter. @default 10 */
  size?: number;
  /** Force pulse on/off. Defaults to pulsing only when state === "live". */
  pulse?: boolean | null;
  style?: React.CSSProperties;
}

/** Status dot; pulses green when live (sharing location). */
export function PresenceDot(props: PresenceDotProps): JSX.Element;
