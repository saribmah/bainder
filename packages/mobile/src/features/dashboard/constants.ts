import { color } from "@baindar/ui";
import type { Document } from "@baindar/sdk";

export const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
};

export const KIND_BG: Record<Document["kind"], string> = {
  epub: color.highlight.yellow,
};
