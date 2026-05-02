import type { Document } from "@bainder/sdk";

export const ACCEPT_ATTR = ".epub,application/epub+zip";

export const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
};

export const KIND_GRADIENT: Record<Document["kind"], string> = {
  epub: "linear-gradient(160deg, oklch(72% 0.11 76), oklch(48% 0.12 44))",
};
