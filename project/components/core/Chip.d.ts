import * as React from "react";

export interface ChipProps {
  children?: React.ReactNode;
  /** Filled dark when selected. @default false */
  selected?: boolean;
  /** Leading node (icon/avatar). */
  leading?: React.ReactNode;
  /** Show a × and fire this when clicked. */
  onRemove?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  /** Unselected color family. @default "neutral" */
  tone?: "neutral" | "brand" | "live";
  style?: React.CSSProperties;
}

/** Selectable / removable pill — filters, quick replies, place suggestions. */
export function Chip(props: ChipProps): JSX.Element;
