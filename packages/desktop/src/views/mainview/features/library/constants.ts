import type { Document, Highlight } from "@bainder/sdk";

export const ACCEPT_ATTR = ".epub,application/epub+zip";

export type LibraryFilter = "all" | "books" | "pdfs" | "articles";

export const FILTER_LABEL: Record<LibraryFilter, string> = {
  all: "All",
  books: "Books",
  pdfs: "PDFs",
  articles: "Articles",
};

export const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "BOOK",
};

export const HIGHLIGHT_COLOR: Record<Highlight["color"], string> = {
  pink: "var(--hl-pink)",
  yellow: "var(--hl-yellow)",
  green: "var(--hl-green)",
  blue: "var(--hl-blue)",
  purple: "var(--hl-purple)",
};

export const HIGHLIGHT_LABEL: Record<Highlight["color"], string> = {
  pink: "Pink",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
};

export type CoverPalette = {
  background: string;
  ink: string;
  accent: string;
};

export const COVER_PALETTES: CoverPalette[] = [
  { background: "oklch(86% 0.12 86)", ink: "oklch(28% 0.04 60)", accent: "oklch(45% 0.14 36)" },
  { background: "oklch(88% 0.04 70)", ink: "oklch(28% 0.04 60)", accent: "oklch(45% 0.07 30)" },
  { background: "oklch(58% 0.08 200)", ink: "oklch(96% 0.01 90)", accent: "oklch(85% 0.10 90)" },
  { background: "oklch(38% 0.06 150)", ink: "oklch(94% 0.02 90)", accent: "oklch(78% 0.10 70)" },
  { background: "oklch(22% 0.02 280)", ink: "oklch(95% 0.01 90)", accent: "oklch(72% 0.16 30)" },
  { background: "oklch(86% 0.06 20)", ink: "oklch(30% 0.06 30)", accent: "oklch(55% 0.18 30)" },
  { background: "oklch(94% 0.02 80)", ink: "oklch(28% 0.03 60)", accent: "oklch(45% 0.10 30)" },
  { background: "oklch(35% 0.08 320)", ink: "oklch(95% 0.02 90)", accent: "oklch(80% 0.10 60)" },
  { background: "oklch(72% 0.16 50)", ink: "oklch(22% 0.04 40)", accent: "oklch(95% 0.02 90)" },
];
