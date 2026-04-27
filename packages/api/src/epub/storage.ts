import type { Epub } from "./epub";

// In-memory EPUB store. Holds book metadata, full chapter rows, and TOC tree.
// Replace with R2 (chapter html/text) + Postgres or D1 (rows + metadata) when
// wiring real persistence — keep the same exported surface.
export namespace EpubStorage {
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

  // Internal nested shape mirrors the parsed EPUB TOC. Exposed as a flat list
  // via `flattenToc` so the public schema stays non-recursive.
  export type TocRow = {
    title: string;
    href: string;
    fileHref: string;
    anchor: string;
    children: TocRow[];
  };

  export type EntityRow = {
    id: string;
    title: string;
    authors: string[];
    language: string;
    description: string | null;
    publisher: string | null;
    publishedDate: string | null;
    identifiers: string[];
    subjects: string[];
    chapterCount: number;
    wordCount: number;
    createdAt: Date;
  };

  export const entitySelect = {
    id: true,
    title: true,
    authors: true,
    language: true,
    description: true,
    publisher: true,
    publishedDate: true,
    identifiers: true,
    subjects: true,
    chapterCount: true,
    wordCount: true,
    createdAt: true,
  } as const;

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

  export const toChapterSummary = (row: ChapterRow): Epub.ChapterSummary => ({
    id: row.id,
    bookId: row.bookId,
    order: row.order,
    href: row.href,
    title: row.title,
    wordCount: row.wordCount,
  });

  export const flattenToc = (rows: TocRow[]): Epub.TocItem[] => {
    const out: Epub.TocItem[] = [];
    const visit = (entries: TocRow[], depth: number, parent: number | null): void => {
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

  // ---- In-memory store --------------------------------------------------
  const books = new Map<string, EntityRow>();
  const chaptersByBook = new Map<string, ChapterRow[]>();
  const tocByBook = new Map<string, TocRow[]>();

  export type CreateInput = {
    metadata: Omit<EntityRow, "id" | "chapterCount" | "wordCount" | "createdAt">;
    chapters: Array<Omit<ChapterRow, "id" | "bookId">>;
    toc: TocRow[];
  };

  export const create = async (input: CreateInput): Promise<Epub.Entity> => {
    const id = crypto.randomUUID();
    const wordCount = input.chapters.reduce((sum, c) => sum + c.wordCount, 0);
    const row: EntityRow = {
      id,
      ...input.metadata,
      chapterCount: input.chapters.length,
      wordCount,
      createdAt: new Date(),
    };
    const chapters: ChapterRow[] = input.chapters.map((c) => ({
      ...c,
      bookId: id,
      id: `${id}:${c.order}`,
    }));
    books.set(id, row);
    chaptersByBook.set(id, chapters);
    tocByBook.set(id, input.toc);
    return toEntity(row);
  };

  export const get = async (id: string): Promise<Epub.Entity | null> => {
    const row = books.get(id);
    return row ? toEntity(row) : null;
  };

  export const list = async (): Promise<Epub.Entity[]> => {
    return Array.from(books.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toEntity);
  };

  export const remove = async (id: string): Promise<boolean> => {
    const existed = books.delete(id);
    chaptersByBook.delete(id);
    tocByBook.delete(id);
    return existed;
  };

  export const listChapterSummaries = async (
    bookId: string,
  ): Promise<Epub.ChapterSummary[] | null> => {
    const chapters = chaptersByBook.get(bookId);
    return chapters ? chapters.map(toChapterSummary) : null;
  };

  export const getChapter = async (bookId: string, order: number): Promise<Epub.Chapter | null> => {
    const chapters = chaptersByBook.get(bookId);
    if (!chapters) return null;
    const chapter = chapters[order];
    return chapter ? toChapter(chapter) : null;
  };

  export const listChaptersInRange = async (
    bookId: string,
    from: number,
    to: number,
  ): Promise<Epub.Chapter[] | null> => {
    const chapters = chaptersByBook.get(bookId);
    if (!chapters) return null;
    return chapters.slice(from, to + 1).map(toChapter);
  };

  export const getToc = async (bookId: string): Promise<Epub.TocItem[] | null> => {
    const toc = tocByBook.get(bookId);
    return toc ? flattenToc(toc) : null;
  };
}
