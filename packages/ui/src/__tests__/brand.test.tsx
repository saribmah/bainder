import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandLockup, Monogram, Wordmark } from "../brand/index.ts";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("Wordmark", () => {
  test("renders default mark", () => {
    expect(html(<Wordmark />)).toMatchSnapshot();
  });

  test("renders as heading with custom color", () => {
    expect(html(<Wordmark as="h1" size="lg" color="var(--paper-50)" />)).toMatchSnapshot();
  });
});

describe("Monogram", () => {
  test("renders default mark", () => {
    expect(html(<Monogram />)).toMatchSnapshot();
  });
});

describe("BrandLockup", () => {
  test("renders horizontal lockup", () => {
    expect(html(<BrandLockup size="sm" />)).toMatchSnapshot();
  });

  test("renders stacked lockup", () => {
    expect(html(<BrandLockup orientation="stacked" />)).toMatchSnapshot();
  });
});
