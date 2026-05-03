import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { document } from "./document";
import { shelf } from "./shelf";

// Membership row tying a document to a custom shelf. Many-to-many: a document
// can sit on multiple shelves and a shelf can contain many documents.
//
// `position` is a fractional sort key (real) for manual ordering within the
// shelf — NULL means "fall back to addedAt". Clients pick a midpoint between
// neighbours when reordering; the server does no renumbering.
//
// `user_id` is denormalised onto the row so cascade-on-user-purge clears
// membership even if shelf/document FKs were already gone, and reads can be
// scoped without a third join. By construction it equals both the shelf's
// owner and the document's owner — enforced at write time in the feature
// module.
export const shelfDocument = sqliteTable(
  "shelf_document",
  {
    shelfId: text("shelf_id")
      .notNull()
      .references(() => shelf.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    position: real("position"),
    addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.shelfId, table.documentId] }),
    index("shelf_document_document_id_idx").on(table.documentId),
    index("shelf_document_shelf_position_idx").on(table.shelfId, table.position, table.addedAt),
  ],
);
