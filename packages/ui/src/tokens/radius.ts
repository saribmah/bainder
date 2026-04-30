export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  pill: 999,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;
