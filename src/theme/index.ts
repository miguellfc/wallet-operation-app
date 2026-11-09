import type { TextStyle } from 'react-native';

export const colors = {
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
  error: '#FEFC69',
  scrim: 'rgba(0, 0, 0, 0.6)',
} as const;

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
  labelLegend: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
  labelTab: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, letterSpacing: -0.25 },
  labelAxis: { fontFamily: fonts.regular, fontSize: 11 },
  caption: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>;
