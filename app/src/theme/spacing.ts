// Rally — Spacing, radius, sizing tokens
// Base unit: 4px. Rally leans on generous, friendly spacing.
// Ported from tokens/spacing.css.

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
  12: 96,
} as const;

// Radii — Rally is round & friendly (chat bubbles, pins)
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
  full: 999,
  // Chat bubble radius (one tucked corner set per side in components)
  bubble: 22,
  bubbleTuck: 6,
} as const;

// Control heights
export const control = {
  sm: 36,
  md: 44, // min touch target
  lg: 54,
} as const;
