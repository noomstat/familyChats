import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { semantic, fontFamily, fontSize, radius, shadow } from '../../theme';

export interface ChatBubbleProps {
  children?: React.ReactNode;
  mine?: boolean;
  author?: string;
  time?: string;
  showTail?: boolean;
  attachment?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * FamilyChats ChatBubble — the signature message bubble.
 * `mine` = coral, right-aligned, tucked bottom-right corner.
 * others = white, left-aligned, tucked bottom-left corner.
 */
export function ChatBubble({ children, mine = false, author, time, showTail = true, attachment, style }: ChatBubbleProps) {
  const bg = mine ? semantic.bubbleMeBg : semantic.bubbleThemBg;
  const fg = mine ? semantic.bubbleMeText : semantic.bubbleThemText;

  const cornerRadius = showTail
    ? {
        borderTopLeftRadius: radius.bubble,
        borderTopRightRadius: radius.bubble,
        borderBottomRightRadius: mine ? radius.bubbleTuck : radius.bubble,
        borderBottomLeftRadius: mine ? radius.bubble : radius.bubbleTuck,
      }
    : {
        borderTopLeftRadius: radius.bubble,
        borderTopRightRadius: radius.bubble,
        borderBottomRightRadius: radius.bubble,
        borderBottomLeftRadius: radius.bubble,
      };

  return (
    <View style={[{ alignItems: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }, style]}>
      {!!author && !mine && (
        <Text style={{ fontSize: fontSize.caption, fontFamily: fontFamily.bodySemibold, color: semantic.textMuted, marginBottom: 3, marginLeft: 12 }}>
          {author}
        </Text>
      )}
      <View
        style={{
          backgroundColor: bg,
          borderWidth: mine ? 0 : 1,
          borderColor: semantic.borderSubtle,
          ...cornerRadius,
          ...shadow.bubble,
          paddingHorizontal: attachment ? 6 : 15,
          paddingTop: attachment ? 6 : 10,
          paddingBottom: attachment ? 4 : 10,
        }}
      >
        {attachment && <View style={{ marginBottom: children ? 6 : 0 }}>{attachment}</View>}
        {children != null && (
          <View style={{ paddingHorizontal: attachment ? 9 : 0, paddingTop: attachment ? 2 : 0, paddingBottom: attachment ? 6 : 0 }}>
            {typeof children === 'string' ? (
              <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.bodyMd, lineHeight: fontSize.bodyMd * 1.4, color: fg }}>
                {children}
              </Text>
            ) : (
              children
            )}
          </View>
        )}
      </View>
      {!!time && (
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: semantic.textFaint, marginTop: 4, marginRight: mine ? 8 : 0, marginLeft: mine ? 0 : 12 }}>
          {time}
        </Text>
      )}
    </View>
  );
}
