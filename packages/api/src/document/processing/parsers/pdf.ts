// PDF parser using `unpdf` (Cloudflare Workers-compatible build of pdf.js).
// We extract per-page text and the document's Info-dictionary metadata.
// Page-level images / thumbnails are intentionally out of scope for v1.
import { extractText, getDocumentProxy, getMeta } from "unpdf";

export type ParsedPdf = {
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string; wordCount: number }>;
  metadata: {
    pdfTitle: string | null;
    pdfAuthor: string | null;
    pdfProducer: string | null;
    pdfCreator: string | null;
    extra: Record<string, string> | null;
  };
};

export const parsePdfBytes = async (bytes: Uint8Array): Promise<ParsedPdf> => {
  // `getDocumentProxy` parses once; passing the proxy to both `extractText`
  // and `getMeta` avoids a second parse pass that would happen if we passed
  // raw bytes to each call.
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const proxy = await getDocumentProxy(buffer);

  const extracted = await extractText(proxy, { mergePages: false });
  const meta = await getMeta(proxy).catch(
    () => ({ info: null }) as { info: Record<string, unknown> | null },
  );

  const pages = extracted.text.map((raw, idx) => {
    const cleaned = (raw ?? "").replace(/\s+/g, " ").trim();
    return {
      pageNumber: idx + 1,
      text: cleaned,
      wordCount: cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0,
    };
  });

  const info =
    meta.info && typeof meta.info === "object" ? (meta.info as Record<string, unknown>) : null;
  const readField = (key: string): string | null => {
    if (!info) return null;
    const value = info[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  const extra: Record<string, string> = {};
  if (info) {
    for (const [key, value] of Object.entries(info)) {
      if (typeof value === "string" && value.length > 0) extra[key] = value;
    }
  }

  return {
    pageCount: extracted.totalPages ?? pages.length,
    pages,
    metadata: {
      pdfTitle: readField("Title"),
      pdfAuthor: readField("Author"),
      pdfProducer: readField("Producer"),
      pdfCreator: readField("Creator"),
      extra: Object.keys(extra).length > 0 ? extra : null,
    },
  };
};
