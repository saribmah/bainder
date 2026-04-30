import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type Theme = "light" | "sepia" | "dark";

export const THEME_ORDER: readonly Theme[] = ["light", "sepia", "dark"] as const;

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
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

  return (
    <ThemeContext.Provider value={value}>
      <div data-theme={theme} {...rest}>
        {children}
      </div>
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
