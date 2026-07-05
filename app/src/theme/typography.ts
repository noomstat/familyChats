// FamilyChats — Typography tokens
// Ported from tokens/typography.css. Font family names match the keys
// registered by useFonts() in src/theme/useFamilyChatsFonts.ts.

export const fontFamily = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extra: '800',
} as const;

// Type scale (px, 1.25-ish major)
export const fontSize = {
  displayXl: 64,
  displayLg: 48,
  displayMd: 38,
  titleLg: 30,
  titleMd: 24,
  titleSm: 20,
  bodyLg: 18,
  bodyMd: 16, // base UI text
  bodySm: 14,
  caption: 13,
  micro: 11,
} as const;

// Line heights (multipliers — multiply by fontSize to get RN lineHeight px)
export const lineHeight = {
  tight: 1.05,
  snug: 1.2,
  normal: 1.45,
  relaxed: 1.65,
} as const;

// Letter spacing (px approximations of the em values, for RN letterSpacing)
export const letterSpacing = {
  tight: -0.3,
  snug: -0.15,
  normal: 0,
  wide: 0.6,
  caps: 1,
} as const;
