import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { colors, semantic, fontFamily, fontSize, radius } from '../../theme';

export type ChipTone = 'neutral' | 'brand' | 'live';

export interface ChipProps {
  children?: React.ReactNode;
  selected?: boolean;
  leading?: React.ReactNode;
  onPress?: () => void;
  tone?: ChipTone;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<ChipTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: semantic.surfaceCard, fg: semantic.textBody, border: semantic.borderDefault },
  brand: { bg: semantic.brandSoft, fg: colors.coral700, border: colors.coral200 },
  live: { bg: semantic.liveSoft, fg: colors.ping700, border: colors.ping200 },
};

/** FamilyChats Chip — selectable pill, used for filters, place suggestions, quick replies. */
export function Chip({ children, selected = false, leading, onPress, tone = 'neutral', style }: ChipProps) {
  const base = TONES[tone];
  const sel = selected
    ? { background: colors.ink900, color: colors.white, border: colors.ink900 }
    : { background: base.bg, color: base.fg, border: base.border };

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: sel.border,
        backgroundColor: sel.background,
      },
      style,
    ] as StyleProp<ViewStyle>}>
      {leading}
      <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.bodySm, color: sel.color }}>{children}</Text>
    </Wrapper>
  );
}
