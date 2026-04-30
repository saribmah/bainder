import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { document } from "./document";

// Lightweight image metadata. The original blob lives in R2; we only persist
// what's queryable / display-useful (dimensions + concrete format).
export const imageDocument = sqliteTable("image_document", {
  documentId: text("document_id")
    .primaryKey()
    .references(() => document.id, { onDelete: "cascade" }),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: text("format").notNull(),
});
