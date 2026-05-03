import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// User-created tag-style grouping of documents. A document can belong to many
// shelves; membership lives in `shelf_document`. This table holds the shelf
// itself — name, optional description, and an explicit `position` for
// user-driven ordering of the shelves themselves (NULL = sort by created_at).
//
// Smart shelves (Currently reading, Finished) are NOT stored here — they are
// synthesized in the feature module from `progress`. Storage knows nothing
// about them.
//
// Names are unique per user, case-insensitive — enforced by an expression
// index on `lower(name)` so two shelves named "design" and "Design" can't
// co-exist for the same caller.
export const shelf = sqliteTable(
  "shelf",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    position: real("position"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("shelf_user_id_name_lower_idx").on(table.userId, sql`lower(${table.name})`),
    index("shelf_user_id_position_idx").on(table.userId, table.position, table.createdAt),
  ],
);
