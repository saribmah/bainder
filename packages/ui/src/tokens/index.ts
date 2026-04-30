export { color } from "./color.ts";
export type { Color } from "./color.ts";

export { font } from "./font.ts";
export type { Font } from "./font.ts";

export { space } from "./space.ts";
export type { Space, SpaceKey } from "./space.ts";

export { radius } from "./radius.ts";
export type { Radius, RadiusKey } from "./radius.ts";

export { shadow } from "./shadow.ts";
export type { Shadow, ShadowKey } from "./shadow.ts";

export { motion, motionDuration, motionEasing } from "./motion.ts";
export type { Motion, MotionDuration, MotionEasing } from "./motion.ts";

export { typography } from "./typography.ts";
export type { Typography, TypographyKey } from "./typography.ts";

import { color } from "./color.ts";
import { font } from "./font.ts";
import { motion, motionDuration, motionEasing } from "./motion.ts";
import { radius } from "./radius.ts";
import { shadow } from "./shadow.ts";
import { space } from "./space.ts";
import { typography } from "./typography.ts";

export const tokens = {
  color,
  font,
  space,
  radius,
  shadow,
  motion,
  motionDuration,
  motionEasing,
  typography,
} as const;

export type Tokens = typeof tokens;
