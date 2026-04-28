import { z } from "zod";
import { NamedError } from "../utils/error";
import { EpubAssetStore } from "./asset-store";
import { parseEpubBytes, ParseFailure, type ParsedTocEntry } from "./parser";
import { EpubStorage } from "./storage";

// EPUB ingest + AI-context surface. One self-contained feature; PDF, receipts,
// and image features will sit alongside as siblings (see `.agents/add-feature.md`).
export namespace Epub {
  // ---- Errors -----------------------------------------------------------
  export const EpubNotFoundError = NamedError.create(
    "EpubNotFoundError",
    z.object({ id: z.string(), message: z.string().optional() }),
  );
  export type EpubNotFoundError = InstanceType<typeof EpubNotFoundError>;

  export const EpubChapterNotFoundError = NamedError.create(
    "EpubChapterNotFoundError",
    z.object({
      bookId: z.string(),
      order: z.number().int(),
      message: z.string().optional(),
    }),
  );
  export type EpubChapterNotFoundError = InstanceType<typeof EpubChapterNotFoundError>;

  export const EpubInvalidFormatError = NamedError.create(
    "EpubInvalidFormatError",
    z.object({ reason: z.string() }),
  );
  export type EpubInvalidFormatError = InstanceType<typeof EpubInvalidFormatError>;

  export const EpubEmptyError = NamedError.create(
    "EpubEmptyError",
    z.object({ message: z.string().optional() }),
  );
  export type EpubEmptyError = InstanceType<typeof EpubEmptyError>;

  // ---- Schemas ----------------------------------------------------------
  // TOC is exposed as a flat list with depth + parent pointers so the OpenAPI
  // schema stays non-recursive (recursive zod schemas don't survive the
  // hono-openapi → @hey-api/openapi-ts pipeline cleanly). Callers can rebuild
  // the tree from `parent` if needed.
  export const TocItem = z
    .object({
      index: z.number().int().nonnegative(),
      parent: z.number().int().nonnegative().nullable(),
      depth: z.number().int().nonnegative(),
      title: z.string(),
      href: z.string(),
      fileHref: z.string(),
      anchor: z.string(),
    })
    .meta({ ref: "EpubTocItem" });
  export type TocItem = z.infer<typeof TocItem>;

  export const Entity = z
    .object({
      id: z.string(),
      title: z.string(),
      authors: z.array(z.string()),
      language: z.string(),
      description: z.string().nullable(),
      publisher: z.string().nullable(),
      publishedDate: z.string().nullable(),
      identifiers: z.array(z.string()),
      subjects: z.array(z.string()),
      // Token URL for the cover image, or null. After Phase 2 lands this is
      // an `assets/{name}` token resolvable via the asset route; Phase 1b
      // stores the raw OPF-relative href as a transient placeholder.
      coverImage: z.string().nullable(),
      chapterCount: z.number().int().nonnegative(),
      wordCount: z.number().int().nonnegative(),
      createdAt: z.string(),
    })
    .meta({ ref: "Epub" });
  export type Entity = z.infer<typeof Entity>;

  export const ChapterSummary = z
    .object({
      id: z.string(),
      bookId: z.string(),
      order: z.number().int().nonnegative(),
      href: z.string(),
      title: z.string(),
      wordCount: z.number().int().nonnegative(),
      linear: z.boolean(),
    })
    .meta({ ref: "EpubChapterSummary" });
  export type ChapterSummary = z.infer<typeof ChapterSummary>;

  export const Chapter = z
    .object({
      id: z.string(),
      bookId: z.string(),
      order: z.number().int().nonnegative(),
      href: z.string(),
      title: z.string(),
      html: z.string(),
      text: z.string(),
      wordCount: z.number().int().nonnegative(),
      linear: z.boolean(),
    })
    .meta({ ref: "EpubChapter" });
  export type Chapter = z.infer<typeof Chapter>;

  export const Detail = z
    .object({
      book: Entity,
      toc: z.array(TocItem),
      chapters: z.array(ChapterSummary),
    })
    .meta({ ref: "EpubDetail" });
  export type Detail = z.infer<typeof Detail>;

  export const ListResponse = z.object({ items: z.array(Entity) });
  export type ListResponse = z.infer<typeof ListResponse>;

  export const ChaptersResponse = z.object({ items: z.array(ChapterSummary) });
  export type ChaptersResponse = z.infer<typeof ChaptersResponse>;

  export const ContextFormat = z.enum(["text", "markdown"]);
  export type ContextFormat = z.infer<typeof ContextFormat>;

  export const ContextQuery = z.object({
    from: z.coerce.number().int().nonnegative().optional(),
    to: z.coerce.number().int().nonnegative().optional(),
    format: ContextFormat.optional(),
  });
  export type ContextQuery = z.infer<typeof ContextQuery>;

  export const ContextResponse = z
    .object({
      bookId: z.string(),
      title: z.string(),
      authors: z.array(z.string()),
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative(),
      chapterCount: z.number().int().nonnegative(),
      wordCount: z.number().int().nonnegative(),
      format: ContextFormat,
      context: z.string(),
    })
    .meta({ ref: "EpubContext" });
  export type ContextResponse = z.infer<typeof ContextResponse>;

  // ---- Operations -------------------------------------------------------
  export const ingest = async (userId: string, bytes: Uint8Array): Promise<Entity> => {
    let parsed;
    try {
      parsed = parseEpubBytes(bytes);
    } catch (e) {
      if (e instanceof ParseFailure) {
        throw new EpubInvalidFormatError({ reason: e.message });
      }
      throw e;
    }
    if (parsed.chapters.length === 0) {
      throw new EpubEmptyError({ message: "EPUB contained no readable chapters" });
    }
    const entity = await EpubStorage.create({
      userId,
      metadata: {
        title: parsed.metadata.title,
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

    // Upload images after the DB write so chapter HTML's `assets/{name}`
    // tokens have a backing object. If R2 fails partway, roll back both R2
    // (best-effort prefix sweep) and the D1 row so the user can retry —
    // partial books would otherwise be silently broken.
    try {
      for (const img of parsed.images) {
        await EpubAssetStore.put(entity.id, img.name, img.bytes, img.contentType);
      }
    } catch (e) {
      await EpubAssetStore.removeAll(entity.id).catch(() => {});
      await EpubStorage.remove(entity.id, userId).catch(() => {});
      throw e;
    }

    return entity;
  };

  export const list = async (userId: string): Promise<Entity[]> => EpubStorage.list(userId);

  export const get = async (userId: string, id: string): Promise<Entity> => {
    const entity = await EpubStorage.get(id, userId);
    if (!entity) throw new EpubNotFoundError({ id });
    return entity;
  };

  export const remove = async (userId: string, id: string): Promise<void> => {
    // Verify ownership before any destructive work — also lets us 404 cleanly.
    const book = await EpubStorage.get(id, userId);
    if (!book) throw new EpubNotFoundError({ id });
    // R2 first: if asset cleanup fails, the book is still listable and the
    // user can retry. D1-first would orphan assets we could no longer find.
    await EpubAssetStore.removeAll(id);
    await EpubStorage.remove(id, userId);
  };

  export const getAsset = async (
    userId: string,
    bookId: string,
    name: string,
  ): Promise<EpubAssetStore.Asset | null> => {
    const owned = await EpubStorage.get(bookId, userId);
    if (!owned) return null;
    return EpubAssetStore.get(bookId, name);
  };

  export const getDetail = async (userId: string, id: string): Promise<Detail> => {
    const book = await EpubStorage.get(id, userId);
    if (!book) throw new EpubNotFoundError({ id });
    const [toc, chapters] = await Promise.all([
      EpubStorage.getToc(id, userId),
      EpubStorage.listChapterSummaries(id, userId),
    ]);
    return { book, toc: toc ?? [], chapters: chapters ?? [] };
  };

  export const getChapter = async (
    userId: string,
    bookId: string,
    order: number,
  ): Promise<Chapter> => {
    const book = await EpubStorage.get(bookId, userId);
    if (!book) throw new EpubNotFoundError({ id: bookId });
    const chapter = await EpubStorage.getChapter(bookId, order, userId);
    if (!chapter) throw new EpubChapterNotFoundError({ bookId, order });
    return chapter;
  };

  export const getContext = async (
    userId: string,
    bookId: string,
    query: ContextQuery,
  ): Promise<ContextResponse> => {
    const book = await EpubStorage.get(bookId, userId);
    if (!book) throw new EpubNotFoundError({ id: bookId });

    const from = query.from ?? 0;
    const to = query.to ?? book.chapterCount - 1;
    if (from > to || from >= book.chapterCount) {
      throw new EpubChapterNotFoundError({ bookId, order: from });
    }
    const clampedTo = Math.min(to, book.chapterCount - 1);
    const chapters = (await EpubStorage.listChaptersInRange(bookId, from, clampedTo, userId)) ?? [];
    if (chapters.length === 0) {
      throw new EpubChapterNotFoundError({ bookId, order: from });
    }

    const format = query.format ?? "text";
    const context =
      format === "markdown" ? renderMarkdown(book, chapters) : renderText(book, chapters);
    const wordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);

    return {
      bookId,
      title: book.title,
      authors: book.authors,
      from,
      to: clampedTo,
      chapterCount: chapters.length,
      wordCount,
      format,
      context,
    };
  };

  // ---- Helpers (feature-local) ------------------------------------------
  const flattenToc = (rows: ParsedTocEntry[]): TocItem[] => {
    const out: TocItem[] = [];
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

  const renderText = (book: Entity, chapters: Chapter[]): string => {
    const header = [
      `Title: ${book.title}`,
      book.authors.length ? `Authors: ${book.authors.join(", ")}` : null,
      book.language ? `Language: ${book.language}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const body = chapters.map((c) => `## ${c.title}\n\n${c.text}`).join("\n\n");
    return `${header}\n\n${body}`.trim();
  };

  const renderMarkdown = (book: Entity, chapters: Chapter[]): string => {
    const header = `# ${book.title}\n\n${book.authors.length ? `_by ${book.authors.join(", ")}_\n\n` : ""}`;
    const body = chapters.map((c) => `## ${c.title}\n\n${c.text}`).join("\n\n");
    return `${header}${body}`.trim();
  };
}
