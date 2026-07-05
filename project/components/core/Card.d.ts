import * as React from "react";

export interface CardProps {
  children?: React.ReactNode;
  /** Inner padding. @default "lg" */
  padding?: "none" | "sm" | "md" | "lg";
  /** Lift + pointer on hover. @default false */
  interactive?: boolean;
  /** Resting shadow depth. @default "sm" */
  elevation?: "none" | "xs" | "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

/** Base white surface — softly rounded, warm shadow. */
export function Card(props: CardProps): JSX.Element;
