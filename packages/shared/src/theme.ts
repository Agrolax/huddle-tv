/** 10-foot UI tokens for a 1920×1080 Vega TV. Content stays inside the ~5% safe area. */
export const screen = {
  width: 1920,
  height: 1080,
} as const;

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
  /** Widget accents, used for the tile's icon chip and top rule. */
  widget: {
    clock: '#3D8BFF',
    calendar: '#3DCF8E',
    tonight: '#B57BFF',
    profiles: '#F5A524',
    sketch: '#FF7A59',
    smartHome: '#2EC4C4',
    phone: '#9AA3B2',
  },
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

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const focus = {
  scale: 1.05,
  borderWidth: 4,
  /** ms. Focus moves feel instant at 150–250ms. */
  duration: 160,
} as const;

export const theme = {screen, colors, space, type, radius, focus} as const;
export type Theme = typeof theme;
