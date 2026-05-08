import type { SqlMigration } from "../../utils/sqlite-migrations";
import { conversationsPrimaryDocumentIndexSql } from "../tables";

export const migration: SqlMigration = {
  id: 2,
  name: "conversation_primary_document_index",
  sql: conversationsPrimaryDocumentIndexSql,
};
