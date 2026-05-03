import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { document } from "./document";

// Text-anchored colour overlays a user paints onto a document. A highlight
// only carries selection + colour. Free-form thoughts the user writes about
// the highlight (or about the document overall) live in the sibling `note`
// table, which optionally points back at a highlight via `highlight_id`.
//
// Position is encoded type-agnostically:
// - `section_key` identifies the section within the document (e.g.
//   "epub:section:5", "article:section:0"). Each format's pipeline mints
//   the key consistently with the document's manifest.json `sections[]`.
// - `position` is a JSON blob whose shape is owned by the format. For all
//   text-content formats it is `{ offsetStart, offsetEnd }` over the
//   section's canonical `.txt` payload in R2.
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
    sectionKey: text("section_key").notNull(),
    position: text("position", { mode: "json" }).$type<HighlightPosition>().notNull(),
    textSnippet: text("text_snippet").notNull(),
    color: text("color").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("highlight_document_id_created_at_idx").on(table.documentId, table.createdAt),
    index("highlight_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("highlight_document_section_idx").on(table.documentId, table.sectionKey),
  ],
);

// Mirror of the highlight position payload. Shared across formats whose
// positions reduce to a character-offset range. PDF pixel-rect or image
// highlights would extend this into a discriminated union when introduced.
type HighlightPosition = {
  offsetStart: number;
  offsetEnd: number;
};
