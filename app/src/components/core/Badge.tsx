import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, semantic, fontFamily, fontSize, radius } from '../../theme';

export type BadgeTone = 'brand' | 'live' | 'neutral' | 'info' | 'warning' | 'danger';

export interface BadgeProps {
  children?: React.ReactNode;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  brand: { bg: semantic.brand, fg: colors.white },
  live: { bg: semantic.live, fg: colors.white },
  neutral: { bg: semantic.surfaceSunk, fg: semantic.textBody },
  info: { bg: semantic.info, fg: colors.white },
  warning: { bg: semantic.warning, fg: colors.ink900 },
  danger: { bg: semantic.danger, fg: colors.white },
};

/** Rally Badge — small status/count marker. */
export function Badge({ children, tone = 'brand', size = 'md', dot = false, style }: BadgeProps) {
  const t = TONES[tone];

  if (dot) {
    return <View style={[{ width: 9, height: 9, borderRadius: radius.full, backgroundColor: t.bg }, style]} />;
  }

  return (
    <View
      style={[
        {
          minWidth: size === 'sm' ? 18 : 20,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: size === 'sm' ? 1 : 2,
          paddingHorizontal: size === 'sm' ? 7 : 9,
          borderRadius: radius.full,
          backgroundColor: t.bg,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: size === 'sm' ? fontSize.micro : fontSize.caption, color: t.fg }}>
        {children}
      </Text>
    </View>
  );
}
