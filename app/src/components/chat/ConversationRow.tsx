import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { semantic, fontFamily, fontSize, radius } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Badge } from '../core/Badge';
import { PresenceDot } from './PresenceDot';

export interface ConversationRowProps {
  name: string;
  preview: string;
  time: string;
  avatarSrc?: string;
  unread?: number;
  live?: boolean;
  members?: number | null;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Rally ConversationRow — a group/DM row in the chat list. */
export function ConversationRow({
  name,
  preview,
  time,
  avatarSrc,
  unread = 0,
  live = false,
  members = null,
  active = false,
  onPress,
  style,
}: ConversationRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          backgroundColor: active ? semantic.brandSoft : 'transparent',
        },
        style,
      ]}
    >
      <View>
        <Avatar src={avatarSrc} name={name} size={46} presence={live ? 'live' : null} />
        {members != null && (
          <View
            style={{
              position: 'absolute',
              right: -3,
              bottom: -3,
              backgroundColor: semantic.surfaceCard,
              borderWidth: 1,
              borderColor: semantic.borderDefault,
              borderRadius: radius.full,
              paddingHorizontal: 5,
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontSize: 10, fontFamily: fontFamily.monoBold, color: semantic.textMuted }}>{members}</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: fontFamily.bodySemibold, color: semantic.textStrong, fontSize: fontSize.bodyMd, flexShrink: 1 }}>
            {name}
          </Text>
          {live && <PresenceDot state="live" size={8} />}
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: fontSize.bodySm,
            marginTop: 2,
            color: unread ? semantic.textBody : semantic.textMuted,
            fontFamily: unread ? fontFamily.bodyMedium : fontFamily.body,
          }}
        >
          {preview}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: unread ? semantic.brand : semantic.textFaint }}>{time}</Text>
        {unread > 0 && <Badge tone="brand" size="sm">{unread}</Badge>}
      </View>
    </Pressable>
  );
}
