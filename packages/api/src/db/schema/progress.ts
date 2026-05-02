import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { document } from "./document";

// Per-user reading state for a document. Composite primary key on
// (user_id, document_id) — there is at most one progress row per user per
// document, and the upsert path overwrites it in place.
//
// Position is type-agnostic, mirroring `highlight`:
// - `section_key` identifies which section the user last read (e.g.
//   "epub:section:5"). Format-owned, consistent with manifest.json.
// - `position` is an optional JSON blob carrying within-section position
//   when the format has one (e.g. `{ offset }` for text-content formats).
// - `progress_percent` is the high-level "how much have you read" signal,
//   in [0, 1]. Type-agnostic, computed by the client at upsert time.
export const progress = sqliteTable(
  "progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    position: text("position", { mode: "json" }).$type<ProgressPosition>(),
    progressPercent: real("progress_percent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.documentId] }),
    index("progress_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

type ProgressPosition = {
  offset?: number;
};
