import * as React from "react";

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual role. @default "primary" */
  variant?: "primary" | "secondary" | "live" | "ghost" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to fill container width. @default false */
  block?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

/**
 * Rally's primary action control — pill-shaped, coral by default.
 * @startingPoint section="Core" subtitle="Pill buttons in every variant" viewport="700x200"
 */
export function Button(props: ButtonProps): JSX.Element;
