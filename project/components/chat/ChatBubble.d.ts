import * as React from "react";

export interface ChatBubbleProps {
  children?: React.ReactNode;
  /** Sent by the current user — coral, right-aligned. @default false */
  mine?: boolean;
  /** Sender name (shown above incoming bubbles only). */
  author?: string;
  /** Timestamp string, e.g. "14:32". Rendered in mono. */
  time?: string;
  /** Draw the tucked tail corner. @default true */
  showTail?: boolean;
  /** Node above the text — e.g. a <LocationTile />. */
  attachment?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Rally's signature message bubble — coral for you, white for others,
 * with a tucked corner and mono timestamp.
 * @startingPoint section="Chat" subtitle="Message bubbles, both sides" viewport="700x260"
 */
export function ChatBubble(props: ChatBubbleProps): JSX.Element;
