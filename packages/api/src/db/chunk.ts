// Cloudflare D1 caps each prepared statement at 100 bind parameters. A
// multi-row `INSERT ... VALUES (...), (...)` blows past that limit quickly —
// 11 rows of a 10-column table is enough — so storage modules chunk bulk
// writes through this helper and emit one statement per chunk.
const D1_MAX_BIND_PARAMS = 100;

export const chunkForBindLimit = <T>(rows: T[], paramsPerRow: number): T[][] => {
  if (rows.length === 0) return [];
  const perRow = Math.max(1, paramsPerRow);
  const perChunk = Math.max(1, Math.floor(D1_MAX_BIND_PARAMS / perRow));
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += perChunk) {
    chunks.push(rows.slice(i, i + perChunk));
  }
  return chunks;
};
