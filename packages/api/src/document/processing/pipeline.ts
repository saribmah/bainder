import { DocumentAssetStore } from "../asset-store";
import { Epub } from "../formats/epub/epub";
import { EpubStorage } from "../formats/epub/storage";
import { DocumentStorage } from "../storage";
import { parseEpubBytes, ParseFailure, type ParsedTocEntry } from "./parsers/epub";

// Format-aware processing pipeline. Called from the Workflow (and from tests
// via `processInline`). Reads the original blob from R2, dispatches to the
// right parser, persists the format-specific rows, and marks the document as
// processed. The caller catches errors and is responsible for marking failed.
export const processDocument = async (documentId: string): Promise<void> => {
  const row = await DocumentStorage.getInternal(documentId);
  if (!row) {
    throw new Error(`Document ${documentId} not found`);
  }

  const bytes = await DocumentAssetStore.getOriginalBytes(
    row.userId,
    documentId,
    row.r2KeyOriginal,
  );
  if (!bytes) {
    throw new Error(`Original blob missing at ${row.r2KeyOriginal}`);
  }

  const title = await processEpub(documentId, row.userId, bytes);
  await DocumentStorage.markProcessed(documentId, title);
};

const processEpub = async (
  documentId: string,
  userId: string,
  bytes: Uint8Array,
): Promise<string | null> => {
  let parsed;
  try {
    parsed = parseEpubBytes(bytes);
  } catch (e) {
    if (e instanceof ParseFailure) {
      throw new Epub.InvalidFormatError({ reason: e.message });
    }
    throw e;
  }
  if (parsed.chapters.length === 0) {
    throw new Epub.EmptyError({ message: "EPUB contained no readable chapters" });
  }

  await EpubStorage.create({
    documentId,
    metadata: {
      authors: parsed.metadata.authors,
      language: parsed.metadata.language,
      description: parsed.metadata.description,
      publisher: parsed.metadata.publisher,
      publishedDate: parsed.metadata.publishedDate,
      identifiers: parsed.metadata.identifiers,
      subjects: parsed.metadata.subjects,
      coverImage: parsed.metadata.coverImage,
    },
    chapters: parsed.chapters.map((c) => ({
      order: c.order,
      href: c.href,
      title: c.title,
      html: c.html,
      text: c.text,
      wordCount: c.wordCount,
      linear: c.linear,
    })),
    toc: flattenToc(parsed.toc),
  });

  // Upload images so the chapter HTML's `assets/{name}` tokens have a
  // backing object. If R2 fails partway, leave the partial asset set in
  // place — the workflow's outer `markFailed` keeps the document in a
  // "failed" state and the user can reprocess.
  for (const img of parsed.images) {
    await DocumentAssetStore.putAsset(userId, documentId, img.name, img.bytes, img.contentType);
  }

  return parsed.metadata.title || null;
};

// Flatten the EPUB TOC tree into the depth+parent representation used by the
// JSON column. Recursive zod schemas don't survive the OpenAPI codegen
// pipeline cleanly, so we expose a flat list and let clients rebuild the
// tree from `parent` if needed.
const flattenToc = (rows: ParsedTocEntry[]): Epub.TocItem[] => {
  const out: Epub.TocItem[] = [];
  const visit = (entries: ParsedTocEntry[], depth: number, parent: number | null): void => {
    for (const entry of entries) {
      const index = out.length;
      out.push({
        index,
        parent,
        depth,
        title: entry.title,
        href: entry.href,
        fileHref: entry.fileHref,
        anchor: entry.anchor,
      });
      if (entry.children.length > 0) visit(entry.children, depth + 1, index);
    }
  };
  visit(rows, 0, null);
  return out;
};
