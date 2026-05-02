// ASCII slug generator used by the document pipeline to name section files
// in R2 (`content/0014-on-the-dignity-of-occupation.txt`). The slug is for
// human/AI readability — `manifest.json` carries the canonical pointer, so
// collisions don't break correctness.
const MAX_SLUG_LENGTH = 60;
// Unicode combining marks block (U+0300–U+036F). NFKD turns accented chars
// (e.g. "Å") into base + combining diacritic; this strip pass drops the
// diacritic so the downstream A-Z filter keeps the plain letter.
const COMBINING_MARKS = /[̀-ͯ]/g;

export const slugify = (raw: string, fallback: string): string => {
  const ascii = raw
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return ascii || fallback;
};

// Zero-pad an integer to width 4. Section files sort lexicographically when
// listed, so the AI's filesystem tools see chapters in reading order.
export const padOrder = (order: number): string => String(order).padStart(4, "0");
