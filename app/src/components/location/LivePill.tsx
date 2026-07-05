import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, semantic, fontFamily, fontSize, radius } from '../../theme';
import { Icon } from '../core/Icon';
import { PresenceDot } from '../chat/PresenceDot';

export interface LivePillProps {
  label?: string;
  timeLeft?: string;
  onStop?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Rally LivePill — the "sharing live location" status pill with a pulsing dot. */
export function LivePill({ label = 'Sharing live', timeLeft, onStop, compact = false, style }: LivePillProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: compact ? 28 : 34,
          paddingLeft: 12,
          paddingRight: compact ? 10 : 6,
          borderRadius: radius.full,
          backgroundColor: semantic.liveSoft,
          borderWidth: 1,
          borderColor: colors.ping200,
        },
        style,
      ]}
    >
      <PresenceDot state="live" size={9} />
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: fontSize.bodySm, color: colors.ping700 }}>{label}</Text>
      {timeLeft && (
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: colors.ping600 }}>· {timeLeft}</Text>
      )}
      {!compact && onStop && (
        <Pressable
          onPress={onStop}
          accessibilityLabel="Stop sharing"
          style={{ marginLeft: 2, width: 24, height: 24, borderRadius: radius.full, backgroundColor: semantic.live, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="x" size={13} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}
