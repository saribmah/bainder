import { and, asc, eq } from "drizzle-orm";
import { document, epubBook, epubChapter } from "../../../db/schema";
import { Instance } from "../../../instance";
import { Epub } from "./epub";

// D1-backed EPUB store. All read paths join `document` so ownership is
// enforced even if a caller forgets to verify it at the feature layer — a row
// whose owning user_id doesn't match is treated identically to a missing row.
export namespace EpubStorage {
  export const entitySelect = {
    documentId: epubBook.documentId,
    authors: epubBook.authors,
    language: epubBook.language,
    description: epubBook.description,
    publisher: epubBook.publisher,
    publishedDate: epubBook.publishedDate,
    identifiers: epubBook.identifiers,
    subjects: epubBook.subjects,
    toc: epubBook.toc,
    coverImage: epubBook.coverImage,
    chapterCount: epubBook.chapterCount,
    wordCount: epubBook.wordCount,
  } as const;

  export type EntityRow = {
    documentId: string;
    authors: string[];
    language: string;
    description: string | null;
    publisher: string | null;
    publishedDate: string | null;
    identifiers: string[];
    subjects: string[];
    toc: Epub.TocItem[];
    coverImage: string | null;
    chapterCount: number;
    wordCount: number;
  };

  export const chapterSelect = {
    id: epubChapter.id,
    documentId: epubChapter.documentId,
    order: epubChapter.order,
    href: epubChapter.href,
    title: epubChapter.title,
    html: epubChapter.html,
    text: epubChapter.text,
    wordCount: epubChapter.wordCount,
    linear: epubChapter.linear,
  } as const;

  export const chapterSummarySelect = {
    id: epubChapter.id,
    documentId: epubChapter.documentId,
    order: epubChapter.order,
    href: epubChapter.href,
    title: epubChapter.title,
    wordCount: epubChapter.wordCount,
    linear: epubChapter.linear,
  } as const;

  export type ChapterRow = {
    id: string;
    documentId: string;
    order: number;
    href: string;
    title: string;
    html: string;
    text: string;
    wordCount: number;
    linear: boolean;
  };

  export type ChapterSummaryRow = Omit<ChapterRow, "html" | "text">;

  export const toEntity = (row: EntityRow): Epub.Entity => ({
    documentId: row.documentId,
    authors: row.authors,
    language: row.language,
    description: row.description,
    publisher: row.publisher,
    publishedDate: row.publishedDate,
    identifiers: row.identifiers,
    subjects: row.subjects,
    coverImage: row.coverImage,
    chapterCount: row.chapterCount,
    wordCount: row.wordCount,
  });

  export const toChapter = (row: ChapterRow): Epub.Chapter => ({
    id: row.id,
    documentId: row.documentId,
    order: row.order,
    href: row.href,
    title: row.title,
    html: row.html,
    text: row.text,
    wordCount: row.wordCount,
    linear: row.linear,
  });

  export const toChapterSummary = (row: ChapterSummaryRow): Epub.ChapterSummary => ({
    id: row.id,
    documentId: row.documentId,
    order: row.order,
    href: row.href,
    title: row.title,
    wordCount: row.wordCount,
    linear: row.linear,
  });

  export type CreateInput = {
    documentId: string;
    metadata: {
      authors: string[];
      language: string;
      description: string | null;
      publisher: string | null;
      publishedDate: string | null;
      identifiers: string[];
      subjects: string[];
      coverImage: string | null;
    };
    chapters: Array<Omit<ChapterRow, "id" | "documentId">>;
    toc: Epub.TocItem[];
  };

  export const create = async (input: CreateInput): Promise<Epub.Entity> => {
    const wordCount = input.chapters.reduce((sum, c) => sum + c.wordCount, 0);
    const bookRow: EntityRow = {
      documentId: input.documentId,
      authors: input.metadata.authors,
      language: input.metadata.language,
      description: input.metadata.description,
      publisher: input.metadata.publisher,
      publishedDate: input.metadata.publishedDate,
      identifiers: input.metadata.identifiers,
      subjects: input.metadata.subjects,
      toc: input.toc,
      coverImage: input.metadata.coverImage,
      chapterCount: input.chapters.length,
      wordCount,
    };
    const chapterRows: ChapterRow[] = input.chapters.map((c) => ({
      id: `${input.documentId}:${c.order}`,
      documentId: input.documentId,
      order: c.order,
      href: c.href,
      title: c.title,
      html: c.html,
      text: c.text,
      wordCount: c.wordCount,
      linear: c.linear,
    }));

    const db = Instance.db;
    await db.insert(epubBook).values(bookRow);
    if (chapterRows.length > 0) {
      await db.insert(epubChapter).values(chapterRows);
    }
    return toEntity(bookRow);
  };

  export const get = async (documentId: string, userId: string): Promise<Epub.Entity | null> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(epubBook)
      .innerJoin(document, eq(document.id, epubBook.documentId))
      .where(and(eq(epubBook.documentId, documentId), eq(document.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  };

  // Default reading order: linear=true chapters only. Non-linear items
  // (footnotes, ancillary content) are still ingested and reachable via
  // getChapter(order) for direct lookup, but excluded from sidebars and
  // prev/next navigation.
  export const listChapterSummaries = async (
    documentId: string,
    userId: string,
  ): Promise<Epub.ChapterSummary[] | null> => {
    if (!(await isOwned(documentId, userId))) return null;
    const rows = await Instance.db
      .select(chapterSummarySelect)
      .from(epubChapter)
      .where(and(eq(epubChapter.documentId, documentId), eq(epubChapter.linear, true)))
      .orderBy(asc(epubChapter.order));
    return rows.map(toChapterSummary);
  };

  export const getChapter = async (
    documentId: string,
    order: number,
    userId: string,
  ): Promise<Epub.Chapter | null> => {
    const rows = await Instance.db
      .select(chapterSelect)
      .from(epubChapter)
      .innerJoin(document, eq(document.id, epubChapter.documentId))
      .where(
        and(
          eq(epubChapter.documentId, documentId),
          eq(epubChapter.order, order),
          eq(document.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toChapter(row) : null;
  };

  export const getToc = async (
    documentId: string,
    userId: string,
  ): Promise<Epub.TocItem[] | null> => {
    const rows = await Instance.db
      .select({ toc: epubBook.toc })
      .from(epubBook)
      .innerJoin(document, eq(document.id, epubBook.documentId))
      .where(and(eq(epubBook.documentId, documentId), eq(document.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? row.toc : null;
  };

  const isOwned = async (documentId: string, userId: string): Promise<boolean> => {
    const rows = await Instance.db
      .select({ id: document.id })
      .from(document)
      .where(and(eq(document.id, documentId), eq(document.userId, userId)))
      .limit(1);
    return rows.length > 0;
  };
}
