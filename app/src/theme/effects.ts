// FamilyChats — Elevation & effects tokens
// Warm-tinted shadows (never pure black), soft and low for a tactile feel.
// Ported from tokens/effects.css. RN doesn't support multi-layer CSS box-shadow,
// so each token below is the closest single-layer { shadowColor, shadowOffset,
// shadowOpacity, shadowRadius, elevation } equivalent (elevation for Android).

import { ViewStyle } from 'react-native';

const warm = '#2E2118';

export const shadow: Record<string, ViewStyle> = {
  none: {},
  xs: { shadowColor: warm, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: warm, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  md: { shadowColor: warm, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 5 },
  lg: { shadowColor: warm, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.14, shadowRadius: 34, elevation: 10 },
  xl: { shadowColor: warm, shadowOffset: { width: 0, height: 26 }, shadowOpacity: 0.18, shadowRadius: 60, elevation: 16 },
  // Bubble / pin lift
  bubble: { shadowColor: warm, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  pin: { shadowColor: '#FF5A3C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6 },
};

export const duration = {
  fast: 120,
  base: 200,
  slow: 360,
} as const;

// easing curves, for use with Animated.Easing.bezier(...)
export const easing = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
};

export const blurSheet = 16;
