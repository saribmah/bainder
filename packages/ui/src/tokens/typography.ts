import { font } from "./font.ts";

type TypographyPreset = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textAlign?: "left" | "center" | "right";
  fontVariationSettings?: string;
};

export const typography = {
  displayXL: {
    fontFamily: font.family.display,
    fontWeight: 400,
    fontSize: 64,
    lineHeight: 1.02,
    letterSpacing: -0.02,
    fontVariationSettings: '"opsz" 144, "SOFT" 30',
  },
  displayL: {
    fontFamily: font.family.display,
    fontWeight: 400,
    fontSize: 48,
    lineHeight: 1.05,
    letterSpacing: -0.02,
    fontVariationSettings: '"opsz" 144, "SOFT" 30',
  },
  displayM: {
    fontFamily: font.family.display,
    fontWeight: 400,
    fontSize: 36,
    lineHeight: 1.08,
    letterSpacing: -0.015,
    fontVariationSettings: '"opsz" 96, "SOFT" 30',
  },
  displayS: {
    fontFamily: font.family.display,
    fontWeight: 400,
    fontSize: 28,
    lineHeight: 1.15,
    letterSpacing: -0.01,
    fontVariationSettings: '"opsz" 60, "SOFT" 30',
  },
  displayXS: {
    fontFamily: font.family.display,
    fontWeight: 500,
    fontSize: 22,
    lineHeight: 1.2,
    letterSpacing: -0.005,
    fontVariationSettings: '"opsz" 36, "SOFT" 30',
  },
  bodyL: {
    fontFamily: font.family.ui,
    fontWeight: 400,
    fontSize: 17,
    lineHeight: 1.5,
    letterSpacing: -0.005,
  },
  bodyM: {
    fontFamily: font.family.ui,
    fontWeight: 400,
    fontSize: 15,
    lineHeight: 1.5,
    letterSpacing: -0.003,
  },
  bodyS: {
    fontFamily: font.family.ui,
    fontWeight: 400,
    fontSize: 13,
    lineHeight: 1.45,
  },
  labelL: {
    fontFamily: font.family.ui,
    fontWeight: 500,
    fontSize: 15,
    lineHeight: 1.3,
    letterSpacing: -0.003,
  },
  labelM: {
    fontFamily: font.family.ui,
    fontWeight: 500,
    fontSize: 13,
    lineHeight: 1.25,
  },
  labelS: {
    fontFamily: font.family.ui,
    fontWeight: 500,
    fontSize: 11,
    lineHeight: 1.2,
    letterSpacing: 0.04,
    textTransform: "uppercase",
  },
  readingL: {
    fontFamily: font.family.reading,
    fontWeight: 400,
    fontSize: 19,
    lineHeight: 1.65,
  },
  readingM: {
    fontFamily: font.family.reading,
    fontWeight: 400,
    fontSize: 17,
    lineHeight: 1.65,
  },
  readingChap: {
    fontFamily: font.family.display,
    fontWeight: 500,
    fontSize: 22,
    lineHeight: 1.2,
    letterSpacing: -0.005,
    textAlign: "center",
  },
} as const satisfies Record<string, TypographyPreset>;

export type Typography = typeof typography;
export type TypographyKey = keyof Typography;
