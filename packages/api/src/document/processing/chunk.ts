// Pure section-text chunker. Used by the format Workflow to split each
// section's `.txt` into bounded units that fit BinderDO/DocumentDO storage
// budgets and produce sane FTS5 hits. See PRD §10.
//
// Cloudflare's SQLite-backed Durable Objects cap any single string/BLOB/row
// at 2 MB. We pick a much smaller default chunk size to keep FTS index
// growth predictable and to keep individual snippet reads cheap.

export type Chunk = {
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
};

export type ChunkOptions = {
  maxChars?: number;
  overlap?: number;
};

const DEFAULT_MAX_CHARS = 8_000;
const DEFAULT_OVERLAP = 200;

// Chunks must satisfy: deterministic indexing (same input → same chunkIndex
// at same offsets) so workflow step replays UPSERT into the same rows
// without duplication or shifting; non-empty (no zero-length chunks); and
// total coverage of the input (every character appears in at least one
// chunk).
export const chunkSection = (text: string, opts: ChunkOptions = {}): Chunk[] => {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const overlap = opts.overlap ?? DEFAULT_OVERLAP;
  if (maxChars <= 0) throw new Error("chunkSection: maxChars must be positive");
  if (overlap < 0) throw new Error("chunkSection: overlap must be non-negative");
  if (overlap >= maxChars) {
    throw new Error("chunkSection: overlap must be less than maxChars");
  }

  if (text.length === 0) return [];
  if (text.length <= maxChars) {
    return [{ chunkIndex: 0, startOffset: 0, endOffset: text.length, text }];
  }

  const stride = maxChars - overlap;
  const out: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    out.push({
      chunkIndex: index,
      startOffset: start,
      endOffset: end,
      text: text.slice(start, end),
    });
    if (end >= text.length) break;
    index += 1;
    start += stride;
  }

  return out;
};
