import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { semantic, space, radius, shadow } from '../../theme';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardElevation = 'none' | 'xs' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children?: React.ReactNode;
  padding?: CardPadding;
  elevation?: CardElevation;
  style?: StyleProp<ViewStyle>;
}

const PADS: Record<CardPadding, number> = { none: 0, sm: space[4], md: space[5], lg: space[6] };

/** Rally Card — the base surface. White, softly rounded, warm shadow. */
export function Card({ children, padding = 'lg', elevation = 'sm', style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: semantic.surfaceCard,
          borderWidth: 1,
          borderColor: semantic.borderSubtle,
          borderRadius: radius.lg,
          padding: PADS[padding],
          ...shadow[elevation],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
