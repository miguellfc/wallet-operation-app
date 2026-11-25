import { StyleSheet, type TextStyle } from 'react-native';

export type ThemeName = 'dark' | 'light';

const darkPalette = {
  bgApp: '#070D20',
  surface: 'rgba(255, 255, 255, 0.04)',
  surfaceSubtle: 'rgba(255, 255, 255, 0.03)',
  input: 'rgba(255, 255, 255, 0.05)',
  row: 'rgba(7, 13, 32, 0.5)',
  segment: 'rgba(8, 13, 29, 0.8)',
  tooltip: 'rgba(37, 41, 58, 0.9)',
  glow: 'rgba(92, 107, 192, 0.36)',
  avatar: '#BAC3FF',
  incomeSoft: 'rgba(152, 167, 255, 0.15)',
  expenseSoft: 'rgba(254, 252, 105, 0.15)',
  categoryIcon: 'rgba(254, 252, 105, 0.1)',
  categoryIconIncome: 'rgba(140, 197, 252, 0.1)',
  brand: '#97A1F9',
  income: '#8CC5FC',
  expense: '#FEFC69',
  gradientYellow: '#FEFC69',
  gradientGreen: '#B1FF9D',
  gradientTeal: '#9FF8DF',
  gradientIndigo: '#97A1F9',
  textPrimary: '#DEE1F8',
  textSecondary: '#C6C5D3',
  textMuted: '#8F909D',
  textAccent: '#BBC4F7',
  textOnBrand: '#070D20',
  textInverse: '#FFFFFF',
  error: '#F99799',
  scrim: 'rgba(0, 0, 0, 0.6)',
  danger: '#F99799',
  divider: 'rgba(255, 255, 255, 0.08)',
  track: 'rgba(255, 255, 255, 0.12)',
  trackOn: 'rgba(151, 161, 249, 0.35)',
  heroCard: 'rgba(0, 0, 0, 0.26)',
  excludedBorder: 'rgba(254, 252, 105, 0.35)',
  badge: '#070D20',
  iconOnSurface: '#FFFFFF',
  shadowGlow: 'rgba(92, 107, 192, 0.35)',
  shadowAvatar: 'rgba(186, 195, 255, 0.25)',
  shadowTooltip: 'rgba(8, 13, 29, 0.8)',
  shadowCard: 'rgba(0, 0, 0, 0.1)',
  iconAccent: '#BAC3FF',
  textStrong: '#FFFFFF',
};

export type Palette = Record<keyof typeof darkPalette, string>;

const lightPalette: Palette = {
  bgApp: '#EEF0F7',
  surface: '#FFFFFF',
  surfaceSubtle: 'rgba(255, 255, 255, 0.75)',
  input: 'rgba(7, 13, 32, 0.05)',
  row: '#FFFFFF',
  segment: 'rgba(7, 13, 32, 0.06)',
  tooltip: '#FFFFFF',
  glow: 'rgba(92, 107, 192, 0.18)',
  avatar: '#DDE1FF',
  incomeSoft: 'rgba(110, 120, 230, 0.14)',
  expenseSoft: 'rgba(160, 124, 0, 0.12)',
  categoryIcon: 'rgba(160, 124, 0, 0.12)',
  categoryIconIncome: 'rgba(47, 128, 209, 0.12)',
  brand: '#6E78E6',
  income: '#1F6BB8',
  expense: '#7A5E00',
  gradientYellow: '#FEFC69',
  gradientGreen: '#B1FF9D',
  gradientTeal: '#9FF8DF',
  gradientIndigo: '#97A1F9',
  textPrimary: '#141A33',
  textSecondary: '#4B5068',
  textMuted: '#5F6378',
  textAccent: '#4A55C7',
  textOnBrand: '#070D20',
  textInverse: '#FFFFFF',
  error: '#C2410C',
  scrim: 'rgba(7, 13, 32, 0.35)',
  danger: '#B8323D',
  divider: 'rgba(7, 13, 32, 0.08)',
  track: 'rgba(7, 13, 32, 0.12)',
  trackOn: 'rgba(110, 120, 230, 0.35)',
  heroCard: '#FFFFFF',
  excludedBorder: 'rgba(160, 124, 0, 0.45)',
  badge: '#1E2440',
  iconOnSurface: '#141A33',
  shadowGlow: 'rgba(92, 107, 192, 0.2)',
  shadowAvatar: 'rgba(92, 107, 192, 0.2)',
  shadowTooltip: 'rgba(20, 26, 51, 0.15)',
  shadowCard: 'rgba(20, 26, 51, 0.06)',
  iconAccent: '#4A55C7',
  textStrong: '#141A33',
};

const PALETTES: Record<ThemeName, Palette> = { dark: { ...darkPalette }, light: lightPalette };

export const themePalette = (name: ThemeName): Palette => PALETTES[name];

export const colors: Palette = { ...darkPalette };

let activeTheme: ThemeName = 'dark';
let themeVersion = 0;

export const currentTheme = () => activeTheme;

export function applyTheme(name: ThemeName) {
  if (name === activeTheme) return;
  activeTheme = name;
  Object.assign(colors, PALETTES[name]);
  themeVersion += 1;
}

type StyleDefinitions = Parameters<typeof StyleSheet.create>[0];

export function themedStyles<S extends StyleDefinitions>(factory: () => S & StyleDefinitions): Readonly<S> {
  let cache: Readonly<S> | null = null;
  let cachedVersion = -1;
  const resolve = (): Readonly<S> => {
    if (!cache || cachedVersion !== themeVersion) {
      cache = StyleSheet.create(factory());
      cachedVersion = themeVersion;
    }
    return cache;
  };
  return new Proxy({} as Readonly<S>, {
    get: (_, key) => resolve()[key as keyof S],
    has: (_, key) => key in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_, key) => Object.getOwnPropertyDescriptor(resolve(), key),
  });
}

export const layout = {
  maxContentWidth: 520,
  minTouchTarget: 44,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
} as const;

export const fonts = {
  light: 'Montserrat_300Light',
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  extraBold: 'Montserrat_800ExtraBold',
  black: 'Montserrat_900Black',
  displayBold: 'ClashDisplay-Bold',
} as const;

export const typography = {
  displayHero: { fontFamily: fonts.black, fontSize: 40, lineHeight: 44 },
  displayAmount: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 40 },
  titleSection: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.45 },
  titleStat: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.45 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22, letterSpacing: 0.14 },
  bodyRegular: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 26 },
  bodyLink: { fontFamily: fonts.light, fontSize: 18 },
  buttonLabel: { fontFamily: fonts.medium, fontSize: 16 },
  segmentLabel: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 18, letterSpacing: 0.8 },
  labelOverline: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelLegend: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
  labelTab: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: -0.25 },
  labelAxis: { fontFamily: fonts.regular, fontSize: 11 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;
