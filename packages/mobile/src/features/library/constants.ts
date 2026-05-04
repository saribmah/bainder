import type { Document, Highlight } from "@baindar/sdk";
import { color } from "@baindar/ui";

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
  pink: color.highlight.pink,
  yellow: color.highlight.yellow,
  green: color.highlight.green,
  blue: color.highlight.blue,
  purple: color.highlight.purple,
};

export const HIGHLIGHT_LABEL: Record<Highlight["color"], string> = {
  pink: "Pink",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
};

export const COVER_PALETTES = [
  { background: "#e7c85f", ink: "#3d332c", accent: "#8f4b26" },
  { background: "#e4d5be", ink: "#3d332c", accent: "#7a4b38" },
  { background: "#4f95a0", ink: "#fefcfa", accent: "#f0d885" },
  { background: "#315b43", ink: "#fefcfa", accent: "#d7bf66" },
  { background: "#22202a", ink: "#fefcfa", accent: "#dc835d" },
  { background: "#edc2c1", ink: "#4d2727", accent: "#bf4b41" },
  { background: "#f4ead8", ink: "#3d332c", accent: "#8d5132" },
  { background: "#4a2844", ink: "#fefcfa", accent: "#d2b56d" },
  { background: "#d98a37", ink: "#2f2118", accent: "#fefcfa" },
] as const;
