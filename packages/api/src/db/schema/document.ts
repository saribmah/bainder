import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// Parent "binder row" the user sees in the UI. One row per uploaded file.
// Format-specific content (chapter HTML/text, manifests) lives in R2 under
// `users/{user_id}/documents/{id}/`; D1 holds only queryable metadata.
//
// `cover_image` and `source_url` are type-agnostic: every kind we plan to
// support has zero or one of each (EPUB cover-image manifest item, article
// fetched from a URL). Keeping them on `document` lets the dashboard render
// list cards in a single D1 read with no R2 manifest fetches.
export const document = sqliteTable(
  "document",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    mimeType: text("mime_type").notNull(),
    originalFilename: text("original_filename").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    title: text("title").notNull(),
    sensitive: integer("sensitive", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull(),
    errorReason: text("error_reason"),
    coverImage: text("cover_image"),
    sourceUrl: text("source_url"),
    r2KeyOriginal: text("r2_key_original").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("document_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("document_user_id_sha256_idx").on(table.userId, table.sha256),
  ],
);
