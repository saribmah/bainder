import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { document } from "./document";

export const pdfDocument = sqliteTable("pdf_document", {
  documentId: text("document_id")
    .primaryKey()
    .references(() => document.id, { onDelete: "cascade" }),
  pageCount: integer("page_count").notNull(),
  pdfTitle: text("pdf_title"),
  pdfAuthor: text("pdf_author"),
  pdfProducer: text("pdf_producer"),
  pdfCreator: text("pdf_creator"),
  pdfMetadata: text("pdf_metadata", { mode: "json" }).$type<Record<string, string>>(),
});

// Pages live in their own table so listing pages doesn't pay for the full text
// payload, and per-page lookup is a single indexed read.
export const pdfPage = sqliteTable(
  "pdf_page",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => pdfDocument.documentId, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    text: text("text").notNull(),
    wordCount: integer("word_count").notNull(),
  },
  (table) => [uniqueIndex("pdf_page_document_page_uq").on(table.documentId, table.pageNumber)],
);
