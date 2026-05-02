import { color } from "../tokens/color.ts";

export type Theme = "light" | "sepia" | "dark";

export const THEME_ORDER: readonly Theme[] = ["light", "sepia", "dark"] as const;

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  fg: string;
  fgSubtle: string;
  fgMuted: string;
  action: string;
  actionHover: string;
  actionFg: string;
  accent: string;
  accentHover: string;
  accentFg: string;
  focus: string;
  text: string;
};

export function themeColors(theme: Theme): ThemeColors {
  switch (theme) {
    case "sepia":
      return {
        bg: color.sepia[50],
        surface: color.sepia[50],
        surfaceRaised: color.sepia[100],
        surfaceHover: color.sepia[100],
        border: color.sepia[200],
        borderStrong: color.sepia[200],
        fg: color.sepia[900],
        fgSubtle: color.sepia[700],
        fgMuted: color.sepia[700],
        action: color.sepia[900],
        actionHover: color.sepia[800],
        actionFg: color.sepia[50],
        accent: color.wine[700],
        accentHover: color.wine[600],
        accentFg: color.paper[50],
        focus: color.sepia[900],
        text: color.sepia[900],
      };
    case "dark":
      return {
        bg: color.night[900],
        surface: color.night[800],
        surfaceRaised: color.night[700],
        surfaceHover: color.night[700],
        border: color.night[700],
        borderStrong: color.night[500],
        fg: color.night[50],
        fgSubtle: color.night[200],
        fgMuted: color.night[200],
        action: color.night[50],
        actionHover: color.night[200],
        actionFg: color.night[900],
        accent: color.wine[300],
        accentHover: color.wine[100],
        accentFg: color.night[900],
        focus: color.night[50],
        text: color.night[50],
      };
    case "light":
    default:
      return {
        bg: color.paper[50],
        surface: color.paper[50],
        surfaceRaised: color.paper[100],
        surfaceHover: color.paper[100],
        border: color.paper[200],
        borderStrong: color.paper[300],
        fg: color.paper[900],
        fgSubtle: color.paper[700],
        fgMuted: color.paper[500],
        action: color.paper[900],
        actionHover: color.paper[800],
        actionFg: color.paper[50],
        accent: color.wine[700],
        accentHover: color.wine[600],
        accentFg: color.paper[50],
        focus: color.paper[900],
        text: color.paper[900],
      };
  }
}
