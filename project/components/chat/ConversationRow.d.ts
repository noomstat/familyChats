import * as React from "react";

export interface ConversationRowProps {
  name: string;
  /** Last-message preview / subtitle. */
  preview?: string;
  /** Timestamp string (mono). */
  time?: string;
  avatarSrc?: string;
  /** Unread count; 0 hides the badge. @default 0 */
  unread?: number;
  /** Someone in this group is sharing live location. @default false */
  live?: boolean;
  /** Member count badge on the avatar (for groups). */
  members?: number | null;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/** A group/DM row in the conversation list. */
export function ConversationRow(props: ConversationRowProps): JSX.Element;
