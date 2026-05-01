import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { document } from "./document";

// User annotations on a document. A row represents either a colour-only
// highlight or a highlight with an attached note (free-form `note` text).
//
// Position is encoded as an EPUB chapter reference plus character offsets
// into the canonical text payload — `epub_chapter.html`'s textContent.
//
// `user_id` is denormalised onto the row so list/update/delete can be
// scoped without joining `document`. It cascades from `user` directly
// alongside `document`, so a user purge clears highlights even if the
// owning document was already gone.
export const highlight = sqliteTable(
  "highlight",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    epubChapterOrder: integer("epub_chapter_order").notNull(),
    offsetStart: integer("offset_start").notNull(),
    offsetEnd: integer("offset_end").notNull(),
    textSnippet: text("text_snippet").notNull(),
    color: text("color").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("highlight_document_id_created_at_idx").on(table.documentId, table.createdAt),
    index("highlight_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("highlight_document_chapter_idx").on(table.documentId, table.epubChapterOrder),
    check("highlight_offset_range", sql`${table.offsetStart} <= ${table.offsetEnd}`),
  ],
);
