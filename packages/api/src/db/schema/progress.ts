import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { document } from "./document";

// Reading-progress state: where a given user last left off in a given
// document. Composite primary key on (user_id, document_id) — there is at
// most one progress row per user per document, and the upsert path
// overwrites it in place.
//
// Position is encoded the same way as `highlight`: exactly one of
// `epub_chapter_order` (EPUB) or `pdf_page_number` (PDF) is set, enforced
// by the CHECK constraint. Other document kinds (image/text) don't store
// progress.
export const progress = sqliteTable(
  "progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    epubChapterOrder: integer("epub_chapter_order"),
    pdfPageNumber: integer("pdf_page_number"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.documentId] }),
    index("progress_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    check(
      "progress_target_xor",
      sql`(${table.epubChapterOrder} IS NULL) <> (${table.pdfPageNumber} IS NULL)`,
    ),
  ],
);
