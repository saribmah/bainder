import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { themeColors, THEME_ORDER, type Theme, type ThemeColors } from "./themeColors.ts";

type ThemeContextValue = {
  theme: Theme;
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

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme]);
  const palette = themeColors(theme);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: palette.surface }, style]} {...rest}>
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
  const { theme } = useTheme();
  return themeColors(theme);
}
