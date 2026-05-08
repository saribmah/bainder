import type { SqlMigration } from "../../utils/sqlite-migrations";
import {
  chunksFtsTableSql,
  chunksTableSql,
  documentMetaTableSql,
  sectionsTableSql,
  summariesTableSql,
} from "../tables";

export const migration: SqlMigration = {
  id: 1,
  name: "initial",
  sql: [
    documentMetaTableSql,
    sectionsTableSql,
    chunksTableSql,
    chunksFtsTableSql,
    summariesTableSql,
  ].join("\n"),
};
