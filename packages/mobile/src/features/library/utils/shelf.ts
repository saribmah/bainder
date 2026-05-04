import type { Shelf } from "@baindar/sdk";
import { COVER_PALETTES } from "../constants";

export const CUSTOM_SHELF_LIMIT = 8;

export const shelfPath = (shelf: Shelf): string =>
  `/library/shelves/${encodeURIComponent(shelf.id)}`;

export const shelfDescription = (shelf: Shelf): string | null =>
  shelf.kind === "custom" ? shelf.description : null;

export const shelfItemNoun = (count: number): string => (count === 1 ? "item" : "items");

const hashString = (value: string): number =>
  [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

export const shelfPaletteColors = (shelf: Shelf): [string, string, string] => {
  const offset = hashString(shelf.id) % COVER_PALETTES.length;
  const colors = [0, 2, 5].map((step) => {
    const palette = COVER_PALETTES[(offset + step) % COVER_PALETTES.length] ?? COVER_PALETTES[0];
    return palette.background;
  });
  return [
    colors[0] ?? COVER_PALETTES[0].background,
    colors[1] ?? colors[0],
    colors[2] ?? colors[0],
  ];
};
