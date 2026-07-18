import React, { useRef } from 'react';
import { Animated, Pressable, Text, ViewStyle, StyleProp } from 'react-native';
import { colors, semantic, fontFamily, fontSize, control, radius, shadow } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'live' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<ButtonSize, { height: number; paddingH: number; fontSize: number; gap: number }> = {
  sm: { height: control.sm, paddingH: 16, fontSize: fontSize.bodySm, gap: 6 },
  md: { height: control.md, paddingH: 22, fontSize: fontSize.bodyMd, gap: 8 },
  lg: { height: control.lg, paddingH: 30, fontSize: fontSize.bodyLg, gap: 10 },
};

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string; shadow: ViewStyle }> = {
  primary: { bg: semantic.brand, fg: semantic.textOnBrand, shadow: shadow.sm },
  secondary: { bg: semantic.surfaceCard, fg: semantic.textStrong, border: semantic.borderDefault, shadow: shadow.xs },
  live: { bg: semantic.live, fg: semantic.liveOn, shadow: shadow.sm },
  ghost: { bg: 'transparent', fg: semantic.textStrong, shadow: {} },
  danger: { bg: semantic.danger, fg: colors.white, shadow: shadow.sm },
};

/** True when a Button's children are only text (string/number, or an array of them) and so must be wrapped in a <Text>. Elements render as-is. */
function isTextLabel(children: React.ReactNode): boolean {
  const kids = React.Children.toArray(children);
  return kids.length > 0 && kids.every((c) => typeof c === 'string' || typeof c === 'number');
}

/** FamilyChats Button — the primary action control. Coral "signal" fill for primary; friendly pill geometry. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  onPress,
  style,
}: ButtonProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], width: block ? '100%' : undefined, opacity: disabled ? 0.5 : 1 }}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: s.gap,
            height: s.height,
            paddingHorizontal: s.paddingH,
            borderRadius: radius.full,
            backgroundColor: v.bg,
            borderWidth: v.border ? 1 : 0,
            borderColor: v.border,
            ...v.shadow,
          },
          style,
        ]}
      >
        {leadingIcon}
        {/* Wrap the label in <Text> whenever it's text-like — a bare string,
            a number, OR an array of them (e.g. `Add {thb(x)}` compiles to
            ["Add ", "฿123"], whose typeof is "object"). The old
            `typeof children === 'string'` check missed the array case, so those
            labels rendered bare and crashed on native with "Text strings must
            be rendered within a <Text>". Non-text children (a custom element)
            still render as-is. */}
        {isTextLabel(children) ? (
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: s.fontSize, color: v.fg }}>{children}</Text>
        ) : (
          children
        )}
        {trailingIcon}
      </Pressable>
    </Animated.View>
  );
}
