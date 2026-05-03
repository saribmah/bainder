import { ProfileTheme } from "@bainder/sdk";
import type { Theme } from "@bainder/ui";

export const profileThemeToUi = (theme: ProfileTheme | undefined): Theme =>
  theme === ProfileTheme.Night ? "dark" : theme === ProfileTheme.Sepia ? "sepia" : "light";

export const uiThemeToProfile = (theme: Theme): ProfileTheme =>
  theme === "dark"
    ? ProfileTheme.Night
    : theme === "sepia"
      ? ProfileTheme.Sepia
      : ProfileTheme.Light;
