import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// Parent "binder row" the user sees in the UI. One row per uploaded file.
// Per-format extraction (chapters, pages, dimensions) lives in sibling tables
// keyed by `document_id`. All R2 keys for this document hang off the
// `users/{user_id}/documents/{id}/` prefix so a user-scoped purge is one sweep.
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
    r2KeyOriginal: text("r2_key_original").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("document_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("document_user_id_sha256_idx").on(table.userId, table.sha256),
  ],
);
