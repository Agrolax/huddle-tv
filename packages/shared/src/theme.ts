/** 10-foot UI tokens for 1920×1080 Vega TV. Keep content inside ~5% safe area. */
export const colors = {
  bg: '#0E1218',
  surface: '#1A222D',
  surfaceRaised: '#243041',
  ink: '#F4F1EA',
  mute: '#9AA3B2',
  focus: '#F5A524',
  focusRing: '#FFE0A3',
  accent: '#3D8BFF',
  board: '#2A3340',
  success: '#3DCF8E',
  danger: '#E85D5D',
} as const;

export const space = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
  /** ~5% of 1920 */
  safeX: 96,
  /** ~5% of 1080 */
  safeY: 54,
} as const;

export const type = {
  hero: 56,
  title: 40,
  body: 28,
  caption: 22,
  chip: 20,
} as const;

export const focus = {
  scale: 1.08,
  borderWidth: 4,
} as const;

export const theme = {colors, space, type, focus} as const;
export type Theme = typeof theme;
