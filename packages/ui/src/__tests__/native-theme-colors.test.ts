import { describe, expect, test } from "bun:test";
import { color } from "../tokens/color.ts";
import { themeColors } from "../theme/themeColors.ts";

describe("native theme colors", () => {
  test("light exposes semantic primitive tokens", () => {
    expect(themeColors("light")).toMatchObject({
      surface: color.paper[50],
      surfaceRaised: color.paper[100],
      border: color.paper[200],
      action: color.paper[900],
      actionFg: color.paper[50],
      accent: color.wine[700],
    });
  });

  test("sepia and dark remap component semantics", () => {
    expect(themeColors("sepia")).toMatchObject({
      surface: color.sepia[50],
      surfaceRaised: color.sepia[100],
      action: color.sepia[900],
      actionFg: color.sepia[50],
    });

    expect(themeColors("dark")).toMatchObject({
      surface: color.night[800],
      surfaceRaised: color.night[700],
      action: color.night[50],
      actionFg: color.night[900],
      accent: color.wine[300],
    });
  });
});
