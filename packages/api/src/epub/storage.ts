import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { epubBook, epubChapter } from "../db/schema";
import { Instance } from "../instance";
import type { Epub } from "./epub";

// D1-backed EPUB store. Books are scoped by userId at every read/write — a
// row whose user_id doesn't match the caller is treated identically to a
// missing row (returns null/false), so callers don't need to distinguish
// "not yours" from "not found".
export namespace EpubStorage {
  export const entitySelect = {
    id: epubBook.id,
    userId: epubBook.userId,
    title: epubBook.title,
    authors: epubBook.authors,
    language: epubBook.language,
    description: epubBook.description,
    publisher: epubBook.publisher,
    publishedDate: epubBook.publishedDate,
    identifiers: epubBook.identifiers,
    subjects: epubBook.subjects,
    toc: epubBook.toc,
    chapterCount: epubBook.chapterCount,
    wordCount: epubBook.wordCount,
    createdAt: epubBook.createdAt,
  } as const;

  export type EntityRow = {
    id: string;
    userId: string;
    title: string;
    authors: string[];
    language: string;
    description: string | null;
    publisher: string | null;
    publishedDate: string | null;
    identifiers: string[];
    subjects: string[];
    toc: Epub.TocItem[];
    chapterCount: number;
    wordCount: number;
    createdAt: Date;
  };

  export const chapterSelect = {
    id: epubChapter.id,
    bookId: epubChapter.bookId,
    order: epubChapter.order,
    href: epubChapter.href,
    title: epubChapter.title,
    html: epubChapter.html,
    text: epubChapter.text,
    wordCount: epubChapter.wordCount,
  } as const;

  export const chapterSummarySelect = {
    id: epubChapter.id,
    bookId: epubChapter.bookId,
    order: epubChapter.order,
    href: epubChapter.href,
    title: epubChapter.title,
    wordCount: epubChapter.wordCount,
  } as const;

  export type ChapterRow = {
    id: string;
    bookId: string;
    order: number;
    href: string;
    title: string;
    html: string;
    text: string;
    wordCount: number;
  };

  export type ChapterSummaryRow = Omit<ChapterRow, "html" | "text">;

  export const toEntity = (row: EntityRow): Epub.Entity => ({
    id: row.id,
    title: row.title,
    authors: row.authors,
    language: row.language,
    description: row.description,
    publisher: row.publisher,
    publishedDate: row.publishedDate,
    identifiers: row.identifiers,
    subjects: row.subjects,
    chapterCount: row.chapterCount,
    wordCount: row.wordCount,
    createdAt: row.createdAt.toISOString(),
  });

  export const toChapter = (row: ChapterRow): Epub.Chapter => ({
    id: row.id,
    bookId: row.bookId,
    order: row.order,
    href: row.href,
    title: row.title,
    html: row.html,
    text: row.text,
    wordCount: row.wordCount,
  });

  export const toChapterSummary = (row: ChapterSummaryRow): Epub.ChapterSummary => ({
    id: row.id,
    bookId: row.bookId,
    order: row.order,
    href: row.href,
    title: row.title,
    wordCount: row.wordCount,
  });

  export type CreateInput = {
    userId: string;
    metadata: {
      title: string;
      authors: string[];
      language: string;
      description: string | null;
      publisher: string | null;
      publishedDate: string | null;
      identifiers: string[];
      subjects: string[];
    };
    chapters: Array<Omit<ChapterRow, "id" | "bookId">>;
    toc: Epub.TocItem[];
  };

  export const create = async (input: CreateInput): Promise<Epub.Entity> => {
    const id = crypto.randomUUID();
    const wordCount = input.chapters.reduce((sum, c) => sum + c.wordCount, 0);
    const createdAt = new Date();
    const bookRow: EntityRow = {
      id,
      userId: input.userId,
      title: input.metadata.title,
      authors: input.metadata.authors,
      language: input.metadata.language,
      description: input.metadata.description,
      publisher: input.metadata.publisher,
      publishedDate: input.metadata.publishedDate,
      identifiers: input.metadata.identifiers,
      subjects: input.metadata.subjects,
      toc: input.toc,
      chapterCount: input.chapters.length,
      wordCount,
      createdAt,
    };
    const chapterRows = input.chapters.map((c) => ({
      id: `${id}:${c.order}`,
      bookId: id,
      order: c.order,
      href: c.href,
      title: c.title,
      html: c.html,
      text: c.text,
      wordCount: c.wordCount,
    }));

    const db = Instance.db;
    await db.insert(epubBook).values(bookRow);
    if (chapterRows.length > 0) {
      await db.insert(epubChapter).values(chapterRows);
    }
    return toEntity(bookRow);
  };

  export const get = async (id: string, userId: string): Promise<Epub.Entity | null> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(epubBook)
      .where(and(eq(epubBook.id, id), eq(epubBook.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  };

  export const list = async (userId: string): Promise<Epub.Entity[]> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(epubBook)
      .where(eq(epubBook.userId, userId))
      .orderBy(desc(epubBook.createdAt));
    return rows.map(toEntity);
  };

  export const remove = async (id: string, userId: string): Promise<boolean> => {
    const rows = await Instance.db
      .delete(epubBook)
      .where(and(eq(epubBook.id, id), eq(epubBook.userId, userId)))
      .returning({ id: epubBook.id });
    return rows.length > 0;
  };

  export const listChapterSummaries = async (
    bookId: string,
    userId: string,
  ): Promise<Epub.ChapterSummary[] | null> => {
    const owned = await isOwned(bookId, userId);
    if (!owned) return null;
    const rows = await Instance.db
      .select(chapterSummarySelect)
      .from(epubChapter)
      .where(eq(epubChapter.bookId, bookId))
      .orderBy(asc(epubChapter.order));
    return rows.map(toChapterSummary);
  };

  export const getChapter = async (
    bookId: string,
    order: number,
    userId: string,
  ): Promise<Epub.Chapter | null> => {
    const rows = await Instance.db
      .select(chapterSelect)
      .from(epubChapter)
      .innerJoin(epubBook, eq(epubBook.id, epubChapter.bookId))
      .where(
        and(
          eq(epubChapter.bookId, bookId),
          eq(epubChapter.order, order),
          eq(epubBook.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toChapter(row) : null;
  };

  export const listChaptersInRange = async (
    bookId: string,
    from: number,
    to: number,
    userId: string,
  ): Promise<Epub.Chapter[] | null> => {
    const owned = await isOwned(bookId, userId);
    if (!owned) return null;
    const rows = await Instance.db
      .select(chapterSelect)
      .from(epubChapter)
      .where(
        and(
          eq(epubChapter.bookId, bookId),
          gte(epubChapter.order, from),
          lte(epubChapter.order, to),
        ),
      )
      .orderBy(asc(epubChapter.order));
    return rows.map(toChapter);
  };

  export const getToc = async (bookId: string, userId: string): Promise<Epub.TocItem[] | null> => {
    const rows = await Instance.db
      .select({ toc: epubBook.toc })
      .from(epubBook)
      .where(and(eq(epubBook.id, bookId), eq(epubBook.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? row.toc : null;
  };

  const isOwned = async (bookId: string, userId: string): Promise<boolean> => {
    const rows = await Instance.db
      .select({ id: epubBook.id })
      .from(epubBook)
      .where(and(eq(epubBook.id, bookId), eq(epubBook.userId, userId)))
      .limit(1);
    return rows.length > 0;
  };
}
