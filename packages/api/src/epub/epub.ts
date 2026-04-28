import { z } from "zod";
import { NamedError } from "../utils/error";
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
    return EpubStorage.create({
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
      },
      chapters: parsed.chapters.map((c) => ({
        order: c.order,
        href: c.href,
        title: c.title,
        html: c.html,
        text: c.text,
        wordCount: c.wordCount,
      })),
      toc: flattenToc(parsed.toc),
    });
  };

  export const list = async (userId: string): Promise<Entity[]> => EpubStorage.list(userId);

  export const get = async (userId: string, id: string): Promise<Entity> => {
    const entity = await EpubStorage.get(id, userId);
    if (!entity) throw new EpubNotFoundError({ id });
    return entity;
  };

  export const remove = async (userId: string, id: string): Promise<void> => {
    const existed = await EpubStorage.remove(id, userId);
    if (!existed) throw new EpubNotFoundError({ id });
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
