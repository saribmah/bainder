import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { THEME_ORDER, ThemeProvider, useTheme } from "../theme/index.ts";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

function ThemeReader() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

describe("ThemeProvider", () => {
  test("renders default light", () => {
    expect(
      html(
        <ThemeProvider>
          <ThemeReader />
        </ThemeProvider>,
      ),
    ).toMatchSnapshot();
  });

  test("controlled sepia", () => {
    expect(
      html(
        <ThemeProvider theme="sepia">
          <ThemeReader />
        </ThemeProvider>,
      ),
    ).toMatchSnapshot();
  });

  test("controlled dark", () => {
    expect(
      html(
        <ThemeProvider theme="dark">
          <ThemeReader />
        </ThemeProvider>,
      ),
    ).toMatchSnapshot();
  });

  test("defaultTheme sepia is initial value", () => {
    expect(
      html(
        <ThemeProvider defaultTheme="sepia">
          <ThemeReader />
        </ThemeProvider>,
      ),
    ).toMatchSnapshot();
  });
});

describe("useTheme", () => {
  test("throws outside provider", () => {
    const Bare = () => {
      useTheme();
      return null;
    };
    expect(() => renderToStaticMarkup(<Bare />)).toThrow(
      "useTheme must be used within a <ThemeProvider>",
    );
  });
});

describe("THEME_ORDER", () => {
  test("contains light, sepia, dark in cycle order", () => {
    expect(THEME_ORDER).toEqual(["light", "sepia", "dark"]);
  });
});
