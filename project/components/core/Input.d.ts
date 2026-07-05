import * as React from "react";

export interface InputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  /** Leading adornment (usually an Icon). */
  leading?: React.ReactNode;
  /** Trailing adornment. */
  trailing?: React.ReactNode;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

/** Pill text field with optional leading/trailing adornments and coral focus ring. */
export function Input(props: InputProps): JSX.Element;
