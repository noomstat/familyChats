import * as React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** On-state color. Use "live" for location-sharing toggles. @default "brand" */
  tone?: "brand" | "live";
  style?: React.CSSProperties;
}

/** Toggle switch — coral on by default, green ("live") for location toggles. */
export function Switch(props: SwitchProps): JSX.Element;
