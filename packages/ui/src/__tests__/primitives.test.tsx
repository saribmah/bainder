import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BookCover,
  Button,
  Card,
  Chip,
  ChipButton,
  Hairline,
  Highlight,
  IconButton,
  Input,
  MatchBadge,
  Progress,
  Tab,
  Tabs,
  Toast,
} from "../primitives/index.ts";
import { Icons } from "../icons/index.ts";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("Button", () => {
  test("primary lg pill (default)", () => {
    expect(html(<Button size="lg">Get Started</Button>)).toMatchSnapshot();
  });

  test("wine md with icon start", () => {
    expect(
      html(
        <Button variant="wine" size="md" iconStart={<Icons.Sparkles size={16} />}>
          Ask Bainder
        </Button>,
      ),
    ).toMatchSnapshot();
  });

  test("secondary rounded sm", () => {
    expect(
      html(
        <Button variant="secondary" shape="rounded" size="sm">
          Add Books Manually
        </Button>,
      ),
    ).toMatchSnapshot();
  });

  test("ghost disabled", () => {
    expect(
      html(
        <Button variant="ghost" disabled>
          Skip
        </Button>,
      ),
    ).toMatchSnapshot();
  });
});

describe("IconButton", () => {
  test("default md", () => {
    expect(
      html(
        <IconButton aria-label="Close">
          <Icons.Close size={18} />
        </IconButton>,
      ),
    ).toMatchSnapshot();
  });

  test("sm", () => {
    expect(
      html(
        <IconButton size="sm" aria-label="Bookmark">
          <Icons.Bookmark size={16} />
        </IconButton>,
      ),
    ).toMatchSnapshot();
  });
});

describe("Input", () => {
  test("plain", () => {
    expect(html(<Input placeholder="Search…" />)).toMatchSnapshot();
  });

  test("with trailing icon", () => {
    expect(
      html(<Input placeholder="Search for a book…" iconEnd={<Icons.Search size={20} />} />),
    ).toMatchSnapshot();
  });

  test("focused state via defaultValue", () => {
    expect(html(<Input defaultValue="signifiers" />)).toMatchSnapshot();
  });
});

describe("Chip", () => {
  test("filled (default)", () => {
    expect(html(<Chip>Childhood memories</Chip>)).toMatchSnapshot();
  });

  test("outline", () => {
    expect(html(<Chip variant="outline">Lost in translation</Chip>)).toMatchSnapshot();
  });

  test("active", () => {
    expect(html(<Chip variant="active">Art-focused narratives</Chip>)).toMatchSnapshot();
  });

  test("ChipButton outline", () => {
    expect(html(<ChipButton variant="outline">Filter</ChipButton>)).toMatchSnapshot();
  });
});

describe("Card", () => {
  test("default", () => {
    expect(html(<Card>content</Card>)).toMatchSnapshot();
  });

  test("elevated", () => {
    expect(html(<Card variant="elevated">elevated</Card>)).toMatchSnapshot();
  });
});

describe("Hairline", () => {
  test("renders", () => {
    expect(html(<Hairline />)).toMatchSnapshot();
  });
});

describe("Tabs", () => {
  test("first active", () => {
    expect(
      html(
        <Tabs>
          <Tab active>About this book</Tab>
          <Tab>Chapters</Tab>
          <Tab>Reviews</Tab>
        </Tabs>,
      ),
    ).toMatchSnapshot();
  });
});

describe("Toast", () => {
  test("with leading check icon", () => {
    expect(
      html(<Toast iconStart={<Icons.Check size={18} />}>Saved to library</Toast>),
    ).toMatchSnapshot();
  });
});

describe("Progress", () => {
  test("default ink at 64%", () => {
    expect(html(<Progress value={64} />)).toMatchSnapshot();
  });

  test("wine thin at 36%", () => {
    expect(html(<Progress value={36} tone="wine" size="thin" />)).toMatchSnapshot();
  });

  test("clamps overflow", () => {
    expect(html(<Progress value={150} />)).toMatchSnapshot();
  });
});

describe("MatchBadge", () => {
  test("93%", () => {
    expect(html(<MatchBadge value={93} />)).toMatchSnapshot();
  });

  test("custom label", () => {
    expect(html(<MatchBadge value={87} label="Read match" />)).toMatchSnapshot();
  });
});

describe("BookCover", () => {
  test("with background gradient", () => {
    expect(
      html(
        <BookCover
          width={76}
          height={110}
          background="linear-gradient(160deg, oklch(60% 0.18 35), oklch(45% 0.16 30))"
          alt="Design for Impact"
        />,
      ),
    ).toMatchSnapshot();
  });

  test("with src", () => {
    expect(
      html(
        <BookCover
          src="https://example.com/cover.jpg"
          width={56}
          height={80}
          alt="The Design of Everyday Things"
        />,
      ),
    ).toMatchSnapshot();
  });
});

describe("Highlight", () => {
  test("default pink", () => {
    expect(
      html(<Highlight>Affordances define what actions are possible.</Highlight>),
    ).toMatchSnapshot();
  });

  test("yellow", () => {
    expect(html(<Highlight color="yellow">Signifiers</Highlight>)).toMatchSnapshot();
  });
});
