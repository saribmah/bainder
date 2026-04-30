import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { document } from "./document";

// Plain-text / markdown documents. The decoded text is stored alongside the
// charset we used to decode it so the reader can render it without re-fetching
// the original blob from R2.
export const textDocument = sqliteTable("text_document", {
  documentId: text("document_id")
    .primaryKey()
    .references(() => document.id, { onDelete: "cascade" }),
  charset: text("charset").notNull(),
  text: text("text").notNull(),
});
