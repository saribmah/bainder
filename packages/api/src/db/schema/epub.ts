import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { document } from "./document";

// EPUB-specific metadata. One row per `document` whose kind = "epub". Title,
// size, ownership, etc. live on `document` — only EPUB-specific fields stay
// here. Arrays and the flat TOC are JSON columns; we always read the whole
// row by document_id, never query "books with author X".
export const epubBook = sqliteTable("epub_book", {
  documentId: text("document_id")
    .primaryKey()
    .references(() => document.id, { onDelete: "cascade" }),
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
});

// Chapters are their own table because (a) html/text payloads are large and
// we don't want to load them when listing book detail / TOC, and (b)
// getChapter(documentId, order) is a hot path served by the unique index.
export const epubChapter = sqliteTable(
  "epub_chapter",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => epubBook.documentId, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    href: text("href").notNull(),
    title: text("title").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    wordCount: integer("word_count").notNull(),
    linear: integer("linear", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("epub_chapter_document_order_uq").on(table.documentId, table.order)],
);

// Mirror of the TOC item shape for the JSON column type. Local to the schema
// so feature code is the one importing schema, never the other way around.
type EpubTocItem = {
  index: number;
  parent: number | null;
  depth: number;
  title: string;
  href: string;
  fileHref: string;
  anchor: string;
};
