import { padOrder, slugify } from "../../utils/slug";
import { DocumentAssetStore } from "../asset-store";
import type { Document } from "../document";
import { Epub } from "../formats/epub/epub";
import { DocumentStorage } from "../storage";
import { parseEpubBytes, ParseFailure, type ParsedTocEntry } from "./parsers/epub";

// Format-aware processing pipeline. Called from the Workflow (and from tests
// via `processInline`). Reads the original blob from R2, dispatches to the
// right parser, writes manifest + per-section content files to R2, and marks
// the document processed. The caller catches errors and is responsible for
// marking failed.
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

  // Reprocess: blow away any partial state (manifest, content files,
  // assets) so a retry produces a clean R2 prefix. `original.*` and the
  // D1 row are preserved.
  await DocumentAssetStore.removeRendered(row.userId, documentId);

  const result = await processEpub(documentId, row.userId, bytes);

  await DocumentStorage.markProcessed(documentId, {
    title: result.title,
    coverImage: result.coverImage,
  });
};

type ProcessResult = {
  title: string | null;
  coverImage: string | null;
};

const processEpub = async (
  documentId: string,
  userId: string,
  bytes: Uint8Array,
): Promise<ProcessResult> => {
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

  // Image assets first — chapter HTML carries `assets/{name}` references and
  // rendered chapters need them resolvable. If any of these fail mid-way the
  // outer try/catch in the workflow records `failed` and the next reprocess
  // does another `purgeRender` pass.
  for (const img of parsed.images) {
    await DocumentAssetStore.putAsset(userId, documentId, img.name, img.bytes, img.contentType);
  }

  // Per-section content files. Slug-prefixed names sort by reading order
  // when listed and are self-describing for AI sandbox tools.
  const usedNames = new Set<string>();
  const sections: Document.SectionSummary[] = [];
  for (const chapter of parsed.chapters) {
    const baseName = `${padOrder(chapter.order)}-${slugify(chapter.title, `section-${chapter.order + 1}`)}`;
    const fileName = uniqueName(baseName, usedNames);
    const htmlName = `${fileName}.html`;
    const textName = `${fileName}.txt`;

    await DocumentAssetStore.putContent(
      userId,
      documentId,
      htmlName,
      chapter.html,
      "text/html; charset=utf-8",
    );
    await DocumentAssetStore.putContent(
      userId,
      documentId,
      textName,
      chapter.text,
      "text/plain; charset=utf-8",
    );

    sections.push({
      sectionKey: Epub.sectionKey(chapter.order),
      order: chapter.order,
      title: chapter.title,
      wordCount: chapter.wordCount,
      linear: chapter.linear,
      href: chapter.href,
      files: { html: `content/${htmlName}`, text: `content/${textName}` },
    });
  }

  const wordCount = parsed.chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const manifest: Document.EpubManifest = {
    schemaVersion: 1,
    kind: "epub",
    title: parsed.metadata.title || "Untitled",
    language: parsed.metadata.language,
    coverImage: parsed.metadata.coverImage,
    chapterCount: parsed.chapters.length,
    wordCount,
    sections,
    metadata: {
      authors: parsed.metadata.authors,
      description: parsed.metadata.description,
      publisher: parsed.metadata.publisher,
      publishedDate: parsed.metadata.publishedDate,
      identifiers: parsed.metadata.identifiers,
      subjects: parsed.metadata.subjects,
    },
    toc: flattenToc(parsed.toc),
  };

  // Manifest LAST. Its presence is the source-of-truth that processing
  // succeeded. A partial-failure run leaves content/* in place but no
  // manifest, and the next pipeline pass purges + rewrites cleanly.
  await DocumentAssetStore.putManifest(userId, documentId, manifest);

  return {
    title: parsed.metadata.title || null,
    coverImage: parsed.metadata.coverImage,
  };
};

// Filename collisions don't matter for correctness — manifest.json carries
// the canonical pointer — but we still want unique R2 keys so a later
// chapter doesn't overwrite an earlier one's bytes.
const uniqueName = (baseName: string, used: Set<string>): string => {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  let i = 2;
  while (used.has(`${baseName}-${i}`)) i++;
  const candidate = `${baseName}-${i}`;
  used.add(candidate);
  return candidate;
};

// Flatten the EPUB TOC tree into the depth+parent representation used by the
// manifest. Recursive zod schemas don't survive the OpenAPI codegen
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
