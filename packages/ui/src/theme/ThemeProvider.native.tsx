import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { themeColors, THEME_ORDER, type Theme, type ThemeColors } from "./themeColors.ts";

type ThemeContextValue = {
  theme: Theme;
  palette: ThemeColors;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = Omit<ViewProps, "children"> & {
  theme?: Theme;
  defaultTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  children: ReactNode;
};

export function ThemeProvider({
  theme: controlled,
  defaultTheme = "light",
  onThemeChange,
  children,
  style,
  ...rest
}: ThemeProviderProps) {
  const [internal, setInternal] = useState<Theme>(defaultTheme);
  const theme = controlled ?? internal;
  const palette = themeColors(theme);

  const setTheme = useCallback(
    (next: Theme) => {
      if (controlled === undefined) setInternal(next);
      onThemeChange?.(next);
    },
    [controlled, onThemeChange],
  );

  const cycleTheme = useCallback(() => {
    const i = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(i + 1) % THEME_ORDER.length];
    if (next) setTheme(next);
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, palette, setTheme, cycleTheme }),
    [theme, palette, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: palette.bg }, style]} {...rest}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}

export function useThemeColors(): ThemeColors {
  const ctx = useContext(ThemeContext);
  return ctx?.palette ?? themeColors("light");
}

// Builders should be defined at module scope so memoization is effective.
// The hook re-evaluates the builder only when the active theme changes.
export function useThemedStyles<T>(builder: (palette: ThemeColors, theme: Theme) => T): T {
  const ctx = useContext(ThemeContext);
  const theme = ctx?.theme ?? "light";
  const palette = ctx?.palette ?? themeColors("light");
  return useMemo(() => builder(palette, theme), [palette, theme, builder]);
}
