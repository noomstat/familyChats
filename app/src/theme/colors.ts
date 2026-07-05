// FamilyChats — Color tokens
// Warm cartography palette: map-pin coral, live-ping green, warm ink + paper.
// Ported 1:1 from tokens/colors.css in the design system export.

export const colors = {
  // ---- Base scales ----

  // Coral — the "signal" / action color (map pin, primary buttons, sends)
  coral50: '#FFF1ED',
  coral100: '#FFE0D6',
  coral200: '#FFC2AF',
  coral300: '#FF9C80',
  coral400: '#FF7657',
  coral500: '#FF5A3C', // brand primary
  coral600: '#ED4526',
  coral700: '#C4331A',
  coral800: '#952717',
  coral900: '#6E2013',

  // Ping — live presence / location / online (fresh mint green)
  ping50: '#E6FBF2',
  ping100: '#C4F5E0',
  ping200: '#8DEBC4',
  ping300: '#4FDCA3',
  ping400: '#23C888',
  ping500: '#12B886', // live location, "on the way"
  ping600: '#0E9C72',
  ping700: '#0B7A5A',
  ping800: '#095E46',
  ping900: '#073F30',

  // Sky — map context, info, quiet links (kept secondary)
  sky50: '#EAF3FF',
  sky100: '#D3E6FF',
  sky200: '#A9CCFF',
  sky300: '#74A9FB',
  sky400: '#4B8BF5',
  sky500: '#2E72E8',
  sky600: '#1F59C4',

  // Warm ink neutrals (slightly toward brown, never pure gray)
  ink900: '#1A1613', // primary text
  ink800: '#2C2621',
  ink700: '#443C34',
  ink600: '#5E544A',
  ink500: '#7B6F63',
  ink400: '#9C9184',
  ink300: '#C2B8AC',
  ink200: '#E1D9CF',
  ink100: '#EFE9E1',
  ink50: '#F6F1EA',

  // Paper — warm off-white surfaces
  paper: '#FAF6F1',
  paperSunk: '#F2ECE4',
  white: '#FFFFFF',

  // Utility semantics
  amber500: '#F5A623', // pending / away
  amber100: '#FDEFD4',
  rose500: '#E23D5B', // destructive / error
  rose100: '#FBE0E5',

  // Map surface (used behind location tiles)
  mapBg: '#E8EEE6',
  mapRoad: '#FFFFFF',
  mapWater: '#CFE0EC',
} as const;

// ---- Semantic aliases (use these in components) ----
export const semantic = {
  brand: colors.coral500,
  brandHover: colors.coral600,
  brandPress: colors.coral700,
  brandSoft: colors.coral50,
  brandOn: colors.white,

  live: colors.ping500,
  liveSoft: colors.ping50,
  liveOn: colors.white,

  info: colors.sky500,
  infoSoft: colors.sky50,

  textStrong: colors.ink900,
  textBody: colors.ink700,
  textMuted: colors.ink500,
  textFaint: colors.ink400,
  textOnBrand: colors.white,
  textLink: colors.coral600,

  surfacePage: colors.paper,
  surfaceCard: colors.white,
  surfaceSunk: colors.paperSunk,
  surfaceInverse: colors.ink900,

  borderSubtle: colors.ink100,
  borderDefault: colors.ink200,
  borderStrong: colors.ink300,

  success: colors.ping500,
  successSoft: colors.ping50,
  warning: colors.amber500,
  warningSoft: colors.amber100,
  danger: colors.rose500,
  dangerSoft: colors.rose100,

  // Chat bubble roles
  bubbleMeBg: colors.coral500,
  bubbleMeText: colors.white,
  bubbleThemBg: colors.white,
  bubbleThemText: colors.ink900,
} as const;
