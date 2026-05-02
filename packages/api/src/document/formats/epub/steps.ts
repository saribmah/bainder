import { formatErrorChain } from "../../../utils/error";
import { padOrder, slugify } from "../../../utils/slug";
import { DocumentAssetStore } from "../../asset-store";
import type { Document } from "../../document";
import { DocumentStorage } from "../../storage";
import { Epub } from "./epub";
import { ParseFailure } from "./parser";

// `error_reason` is exposed to users on the failed-document row, so cap the
// chained message before it balloons (drizzle's query-error message alone
// can run multiple kilobytes of bound parameters).
const MAX_REASON_LENGTH = 2000;

// ---------------------------------------------------------------------------
// EPUB workflow step bodies. Each function is idempotent and is reused by
// both the Cloudflare Workflow class (`./workflow.ts`) and the inline runner
// used in tests. Step functions assume an `Instance.provide(...)` frame is
// already in scope — the workflow class wraps each step.do callback in
// `provide(...)`; tests run inside the harness's own Instance frame.
//
// This file deliberately has no `cloudflare:workers` dependency so the
// Bun-based unit test runtime can import and execute the steps directly.
// ---------------------------------------------------------------------------

export type LoadResult = { userId: string; originalKey: string };

export const loadDocument = async (documentId: string): Promise<LoadResult> => {
  const row = await DocumentStorage.getInternal(documentId);
  if (!row) throw new Error(`Document ${documentId} not found`);
  if (row.kindParsed !== "epub") {
    throw new Error(`EpubWorkflow expected kind=epub for ${documentId}, got ${row.kindParsed}`);
  }
  return { userId: row.userId, originalKey: row.r2KeyOriginal };
};

export const resetRendered = async (userId: string, documentId: string): Promise<void> => {
  await DocumentAssetStore.removeRendered(userId, documentId);
};

export const parseAndRender = async (
  userId: string,
  documentId: string,
  originalKey: string,
): Promise<Document.EpubManifest> => {
  const bytes = await DocumentAssetStore.getOriginalBytes(userId, documentId, originalKey);
  if (!bytes) throw new Error(`Original blob missing at ${originalKey}`);

  let parsed: Epub.Parsed;
  try {
    parsed = Epub.parse(bytes);
  } catch (e) {
    if (e instanceof ParseFailure) {
      throw new Epub.InvalidFormatError({ reason: e.message });
    }
    throw e;
  }
  if (parsed.chapters.length === 0) {
    throw new Epub.EmptyError({ message: "EPUB contained no readable chapters" });
  }

  for (const img of parsed.images) {
    await DocumentAssetStore.putAsset(userId, documentId, img.name, img.bytes, img.contentType);
  }

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
  return {
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
};

export type FinalizedManifest = { title: string | null; coverImage: string | null };

export const writeManifest = async (
  userId: string,
  documentId: string,
  manifest: Document.EpubManifest,
): Promise<FinalizedManifest> => {
  await DocumentAssetStore.putManifest(userId, documentId, manifest);
  return { title: manifest.title || null, coverImage: manifest.coverImage };
};

export const markProcessed = async (
  documentId: string,
  finalized: FinalizedManifest,
): Promise<void> => {
  await DocumentStorage.markProcessed(documentId, finalized);
};

export const recordFailure = async (documentId: string, error: unknown): Promise<void> => {
  const reason = (formatErrorChain(error) || "Processing failed").slice(0, MAX_REASON_LENGTH);
  await DocumentStorage.markFailed(documentId, reason);
};

// ---------------------------------------------------------------------------
// Inline runner. Same end-state semantics as the Workflow class: success
// path runs every step; failure path is caught and recorded on the document
// row (no exception propagates). Tests stub the EPUB_PROCESSOR binding's
// `create` with this so post-trigger document state matches production for
// both happy and parse-failure paths.
// ---------------------------------------------------------------------------

export const runEpubInline = async (documentId: string): Promise<void> => {
  try {
    const loaded = await loadDocument(documentId);
    await resetRendered(loaded.userId, documentId);
    const manifest = await parseAndRender(loaded.userId, documentId, loaded.originalKey);
    const finalized = await writeManifest(loaded.userId, documentId, manifest);
    await markProcessed(documentId, finalized);
  } catch (error) {
    await recordFailure(documentId, error);
  }
};

// ---------------------------------------------------------------------------
// File-local helpers
// ---------------------------------------------------------------------------

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
// manifest. Recursive zod schemas don't survive the OpenAPI codegen pipeline
// cleanly, so we expose a flat list and let clients rebuild the tree from
// `parent` if needed.
const flattenToc = (rows: Epub.ParsedTocNode[]): Epub.TocItem[] => {
  const out: Epub.TocItem[] = [];
  const visit = (entries: Epub.ParsedTocNode[], depth: number, parent: number | null): void => {
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
