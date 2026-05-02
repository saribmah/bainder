import { describe, expect, test } from "bun:test";

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

describe("foundation CSS", () => {
  test("themes expose semantic tokens", async () => {
    const css = await read("../styles/theme.css");

    expect(css).toContain("--bd-surface:");
    expect(css).toContain("--bd-fg:");
    expect(css).toContain("--bd-action:");
    expect(css).toContain('[data-theme="sepia"]');
    expect(css).toContain('[data-theme="dark"]');
  });

  test("primitives consume semantic and spacing tokens", async () => {
    const css = await read("../styles/primitives.css");

    expect(css).toContain("background: var(--bd-surface);");
    expect(css).toContain("color: var(--bd-fg);");
    expect(css).toContain("background: var(--bd-action);");
    expect(css).toContain("gap: var(--space-2);");
    expect(css).toContain("height: var(--space-9);");
  });

  test("typography utilities preserve font-token indirection", async () => {
    const css = await read("../styles/typography.css");

    expect(css).toContain("font-family: var(--font-display);");
    expect(css).toContain("font-family: var(--font-ui);");
    expect(css).toContain("font-family: var(--font-reading);");
  });
});
