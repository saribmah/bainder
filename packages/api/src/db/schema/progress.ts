import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { document } from "./document";

// Reading-progress state: where a given user last left off in a given
// document. Composite primary key on (user_id, document_id) — there is at
// most one progress row per user per document, and the upsert path
// overwrites it in place. Tracks the last EPUB chapter visited.
export const progress = sqliteTable(
  "progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    epubChapterOrder: integer("epub_chapter_order").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.documentId] }),
    index("progress_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);
