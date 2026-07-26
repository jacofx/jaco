import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#0B6B4F',
  primaryDark: '#07543E',
  primarySoft: '#DDEFE7',
  accent: '#F28C28',
  accentDark: '#A94E0A',
  accentSoft: '#FFF0E0',
  ink: '#10231C',
  muted: '#5D6B64',
  canvas: '#F5F8F6',
  surface: '#FFFFFF',
  subtle: '#EDF4F0',
  border: '#D7E2DC',
  borderStrong: '#AFC2B8',
  info: '#1769AA',
  infoSoft: '#E8F3FB',
  success: '#137A55',
  successSoft: '#E4F5ED',
  warning: '#8A4B08',
  warningSoft: '#FFF4E5',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  disabled: '#C8D2CD',
  disabledSurface: '#E8EEEB',
  inverse: '#FFFFFF',
  overlay: 'rgba(16, 35, 28, 0.56)',
  transparent: 'transparent',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  sectionLg: 40,
  page: 48,
  pageLg: 64,
} as const;

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
} as const;

export const typography = {
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: 0,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0,
  },
  h2: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  h3: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodyStrong: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: 0,
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export const shadows = {
  low: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const satisfies Record<string, ViewStyle>;

export const layout = {
  contentMaxWidth: 1180,
  readingMaxWidth: 680,
  formMaxWidth: 520,
  screenPadding: spacing.lg,
  screenPaddingWide: spacing.xxl,
  minimumTouchTarget: 44,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  layout,
} as const;

export type AppTheme = typeof theme;
