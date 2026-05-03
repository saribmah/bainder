import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { document } from "./document";
import { highlight } from "./highlight";

// Free-form text the user attaches to a document. A note is conceptually
// distinct from a highlight: highlights mark a span of text, notes carry
// the user's words. The two are decoupled so a user can:
//   - highlight without writing anything (note-less highlight),
//   - write a thought about the document with no anchor (document-level
//     note: `section_key` and `highlight_id` both NULL),
//   - pin a thought to a section (`section_key` set, `highlight_id` NULL),
//   - comment on a specific highlight (`highlight_id` set; `section_key`
//     mirrors the highlight's section for cheap section-scoped reads).
//
// `user_id` is denormalised onto the row so list/update/delete can be
// scoped without joining `document`. It cascades from `user` directly
// alongside `document`, so a user purge clears notes even if the owning
// document was already gone.
//
// `highlight_id` cascades on delete: removing a highlight removes any
// notes attached to it, since the comment loses its anchor.
export const note = sqliteTable(
  "note",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    sectionKey: text("section_key"),
    highlightId: text("highlight_id").references(() => highlight.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("note_document_id_created_at_idx").on(table.documentId, table.createdAt),
    index("note_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("note_highlight_id_idx").on(table.highlightId),
    index("note_document_section_idx").on(table.documentId, table.sectionKey),
  ],
);
