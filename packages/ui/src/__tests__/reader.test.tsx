import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Icons } from "../icons/index.ts";
import {
  AISheetHeader,
  AISheetInput,
  AISheetQuote,
  AISheetThinking,
  FloatingToolbar,
  FloatingToolbarButton,
  SelectionToolbar,
  Sheet,
} from "../reader/index.ts";
import { ThemeProvider } from "../theme/index.ts";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("FloatingToolbar", () => {
  test("renders 6 buttons in light theme", () => {
    expect(
      html(
        <FloatingToolbar>
          <FloatingToolbarButton aria-label="Copy">
            <Icons.Copy size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Highlight">
            <Icons.Highlight size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Ask Bainder">
            <Icons.Sparkles size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Bookmark">
            <Icons.Bookmark size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Note">
            <Icons.Note size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Share">
            <Icons.Share size={20} />
          </FloatingToolbarButton>
        </FloatingToolbar>,
      ),
    ).toMatchSnapshot();
  });

  test("inside dark ThemeProvider", () => {
    expect(
      html(
        <ThemeProvider theme="dark">
          <FloatingToolbar>
            <FloatingToolbarButton aria-label="Type">
              <Icons.Type size={20} />
            </FloatingToolbarButton>
            <FloatingToolbarButton aria-label="Settings">
              <Icons.Settings size={20} />
            </FloatingToolbarButton>
          </FloatingToolbar>
        </ThemeProvider>,
      ),
    ).toMatchSnapshot();
  });
});

describe("Sheet", () => {
  test("with handle (default)", () => {
    expect(html(<Sheet>content</Sheet>)).toMatchSnapshot();
  });

  test("without handle", () => {
    expect(html(<Sheet showHandle={false}>content</Sheet>)).toMatchSnapshot();
  });
});

describe("AISheet — empty state", () => {
  test("renders header + title + suggestion chips + input", () => {
    expect(
      html(
        <Sheet>
          <AISheetHeader />
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 500,
              margin: 0,
            }}
          >
            What does this passage mean?
          </h3>
          <AISheetInput placeholder="Ask anything…" />
        </Sheet>,
      ),
    ).toMatchSnapshot();
  });
});

describe("AISheet — thinking state", () => {
  test("quote + thinking dots + status", () => {
    expect(
      html(
        <Sheet>
          <AISheetHeader label="Bainder" />
          <AISheetQuote>"Affordances define what actions are possible…"</AISheetQuote>
          <AISheetThinking status="Reading the chapter…" />
        </Sheet>,
      ),
    ).toMatchSnapshot();
  });
});

describe("AISheet — answer state", () => {
  test("quote + answer body", () => {
    expect(
      html(
        <Sheet>
          <AISheetHeader label="Bainder" />
          <AISheetQuote>"Affordances define what actions are possible…"</AISheetQuote>
          <p
            style={{
              fontFamily: "var(--font-reading)",
              fontSize: 12,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Norman is drawing a careful line: an <em>affordance</em> is the relationship between an
            object and a person — what can be done. A <em>signifier</em> is the visible cue that
            tells you so.
          </p>
        </Sheet>,
      ),
    ).toMatchSnapshot();
  });
});

describe("AISheetInput", () => {
  test("disabled send", () => {
    expect(html(<AISheetInput sendDisabled value="" readOnly />)).toMatchSnapshot();
  });
});

describe("AISheetThinking", () => {
  test("without status", () => {
    expect(html(<AISheetThinking />)).toMatchSnapshot();
  });
});

describe("SelectionToolbar", () => {
  test("selection actions", () => {
    expect(
      html(
        <SelectionToolbar
          variant="actions"
          onCopy={() => {}}
          onHighlight={() => {}}
          onAsk={() => {}}
          onAddNote={() => {}}
        />,
      ),
    ).toMatchSnapshot();
  });

  test("default colors with note action", () => {
    expect(
      html(<SelectionToolbar onPickColor={() => {}} onAddNote={() => {}} />),
    ).toMatchSnapshot();
  });

  test("colors only (no note)", () => {
    expect(
      html(<SelectionToolbar colors={["yellow", "pink"]} onPickColor={() => {}} />),
    ).toMatchSnapshot();
  });
});
