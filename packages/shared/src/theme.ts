/** 10-foot UI tokens for a 1920×1080 Vega TV. Content stays inside the ~5% safe area. */
export const screen = {
  width: 1920,
  height: 1080,
} as const;

/**
 * Neutral chrome like the Fire TV home on Vega OS: near-black page, flat grey
 * tiles, white text, white focus ring. Color comes from content (people's
 * avatar colors, posters), not from chrome. One accent for primary buttons.
 */
export const colors = {
  bg: '#0F1111',
  surface: '#1C1F23',
  /** Focused tile, list row, or pressed button. */
  surfaceRaised: '#2B2F35',
  ink: '#FFFFFF',
  mute: '#A7ADB5',
  /** Focus ring: white with a gap, the Vega platform treatment. */
  focusRing: '#FFFFFF',
  /** Primary buttons and the one highlighted value per screen. */
  accent: '#3D8BFF',
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
  hero: 48,
  title: 36,
  body: 28,
  caption: 22,
  chip: 24,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const focus = {
  scale: 1.04,
  borderWidth: 4,
  /** Space between the element and its ring. */
  gap: 4,
  /** ms. Focus moves feel instant at 150–250ms. */
  duration: 160,
} as const;

export const theme = {screen, colors, space, type, radius, focus} as const;
export type Theme = typeof theme;
