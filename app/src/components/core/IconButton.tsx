import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native';
import { colors, semantic, radius, shadow } from '../../theme';
import { Icon } from './Icon';

export type IconButtonVariant = 'primary' | 'live' | 'soft' | 'outline' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  name: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const DIMS: Record<IconButtonSize, number> = { sm: 34, md: 44, lg: 54 };
const GLYPH: Record<IconButtonSize, number> = { sm: 16, md: 20, lg: 24 };

const VARIANTS: Record<IconButtonVariant, { bg: string; fg: string; border?: string; shadow: ViewStyle }> = {
  primary: { bg: semantic.brand, fg: colors.white, shadow: shadow.sm },
  live: { bg: semantic.live, fg: colors.white, shadow: shadow.sm },
  soft: { bg: semantic.surfaceSunk, fg: semantic.textStrong, shadow: {} },
  outline: { bg: semantic.surfaceCard, fg: semantic.textStrong, border: semantic.borderDefault, shadow: shadow.xs },
  ghost: { bg: 'transparent', fg: semantic.textBody, shadow: {} },
};

/** Rally IconButton — circular icon-only control (composer actions, nav). */
export function IconButton({
  name,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  onPress,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const dim = DIMS[size];
  const glyph = GLYPH[size];
  const v = VARIANTS[variant];
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            width: dim,
            height: dim,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: v.bg,
            borderWidth: v.border ? 1 : 0,
            borderColor: v.border,
            ...v.shadow,
          },
          style,
        ]}
      >
        <Icon name={name} size={glyph} color={v.fg} />
      </Pressable>
    </Animated.View>
  );
}
