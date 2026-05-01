import { color } from "../tokens/color.ts";

export type Theme = "light" | "sepia" | "dark";

export const THEME_ORDER: readonly Theme[] = ["light", "sepia", "dark"] as const;

export type ThemeColors = {
  surface: string;
  text: string;
};

export function themeColors(theme: Theme): ThemeColors {
  switch (theme) {
    case "sepia":
      return { surface: color.sepia[50], text: color.sepia[900] };
    case "dark":
      return { surface: color.night[900], text: color.night[50] };
    case "light":
    default:
      return { surface: color.paper[50], text: color.paper[900] };
  }
}
