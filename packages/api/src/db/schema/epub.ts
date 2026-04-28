import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// EPUB book metadata. Arrays (authors/identifiers/subjects) and the flat TOC
// live as JSON columns — we never query "books with author X" / "books with
// subject Y", we always fetch the whole book by id, so a normalized side
// table would add joins with no payoff.
export const epubBook = sqliteTable(
  "epub_book",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    authors: text("authors", { mode: "json" }).$type<string[]>().notNull(),
    language: text("language").notNull(),
    description: text("description"),
    publisher: text("publisher"),
    publishedDate: text("published_date"),
    identifiers: text("identifiers", { mode: "json" }).$type<string[]>().notNull(),
    subjects: text("subjects", { mode: "json" }).$type<string[]>().notNull(),
    toc: text("toc", { mode: "json" }).$type<EpubTocItem[]>().notNull(),
    coverImage: text("cover_image"),
    chapterCount: integer("chapter_count").notNull(),
    wordCount: integer("word_count").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("epub_book_user_id_idx").on(table.userId)],
);

// Chapters are their own table because (a) html/text payloads are large and
// we don't want to load them when listing book detail / TOC, and (b)
// getChapter(bookId, order) is a hot path served by the (book_id, order)
// unique index.
export const epubChapter = sqliteTable(
  "epub_chapter",
  {
    id: text("id").primaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => epubBook.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    href: text("href").notNull(),
    title: text("title").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    wordCount: integer("word_count").notNull(),
    linear: integer("linear", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("epub_chapter_book_order_uq").on(table.bookId, table.order)],
);

// Mirror of `Epub.TocItem` for the JSON column type. Kept local so schema
// has no inbound dep on feature code.
type EpubTocItem = {
  index: number;
  parent: number | null;
  depth: number;
  title: string;
  href: string;
  fileHref: string;
  anchor: string;
};
