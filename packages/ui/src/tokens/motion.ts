export const motionDuration = {
  fast: 120,
  base: 220,
  slow: 420,
  spring: 520,
  page: 320,
} as const;

export const motionEasing = {
  standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  page: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const motion = {
  fast: `${motionDuration.fast}ms ${motionEasing.standard}`,
  base: `${motionDuration.base}ms ${motionEasing.standard}`,
  slow: `${motionDuration.slow}ms ${motionEasing.standard}`,
  spring: `${motionDuration.spring}ms ${motionEasing.spring}`,
  page: `${motionDuration.page}ms ${motionEasing.page}`,
} as const;

export type MotionDuration = typeof motionDuration;
export type MotionEasing = typeof motionEasing;
export type Motion = typeof motion;
