import type { SqlMigration } from "../../utils/sqlite-migrations";
import {
  aiSessionTableSql,
  binderChunkRefsTableSql,
  binderChunkRefsTriggersSql,
  binderChunksFtsTableSql,
  conversationsTableSql,
  documentsTableSql,
  highlightsTableSql,
  metaTableSql,
  notesTableSql,
  progressTableSql,
  shelfDocumentsTableSql,
  shelvesTableSql,
} from "../tables";

export const migration: SqlMigration = {
  id: 1,
  name: "initial",
  sql: [
    metaTableSql,
    documentsTableSql,
    shelvesTableSql,
    shelfDocumentsTableSql,
    progressTableSql,
    highlightsTableSql,
    notesTableSql,
    conversationsTableSql,
    binderChunkRefsTableSql,
    binderChunksFtsTableSql,
    binderChunkRefsTriggersSql,
    aiSessionTableSql,
  ].join("\n"),
};
