import * as React from "react";

export interface LivePillProps {
  /** @default "Sharing live" */
  label?: string;
  /** Countdown string (mono), e.g. "12 min left". */
  timeLeft?: string;
  /** Show a stop button that fires this. */
  onStop?: (e: React.MouseEvent) => void;
  /** Smaller, no stop button. @default false */
  compact?: boolean;
  style?: React.CSSProperties;
}

/** Live-location status pill with a pulsing green dot and optional stop button. */
export function LivePill(props: LivePillProps): JSX.Element;
