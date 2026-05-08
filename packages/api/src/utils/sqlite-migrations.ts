export type SqlMigration = {
  readonly id: number;
  readonly name: string;
  readonly sql: string;
};

type MigrationRow = {
  id: number;
  name: string;
  checksum: string | null;
};

type TableColumn = {
  name: string;
};

export const runSqlMigrations = (
  sql: SqlStorage,
  migrations: readonly SqlMigration[],
  label: string,
): void => {
  assertAppendOnlyOrder(migrations, label);

  sql.exec("PRAGMA foreign_keys = ON");

  sql.exec(`
    CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      checksum TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureMigrationColumns(sql);

  const applied = new Map<number, MigrationRow>();
  for (const row of sql.exec<MigrationRow>(
    "SELECT id, name, checksum FROM _sql_schema_migrations",
  )) {
    applied.set(row.id, row);
  }

  for (const migration of migrations) {
    const checksum = checksumSql(migration.sql);
    const existing = applied.get(migration.id);

    if (existing) {
      if (!existing.checksum) {
        sql.exec(
          "UPDATE _sql_schema_migrations SET name = ?, checksum = ? WHERE id = ?",
          migration.name,
          checksum,
          migration.id,
        );
        continue;
      }

      if (existing.checksum !== checksum) {
        throw new Error(
          `${label} migration ${migration.id} (${migration.name}) was changed after it was applied`,
        );
      }

      continue;
    }

    sql.exec(migration.sql);
    sql.exec(
      "INSERT INTO _sql_schema_migrations(id, name, checksum) VALUES (?, ?, ?)",
      migration.id,
      migration.name,
      checksum,
    );
  }
};

const assertAppendOnlyOrder = (migrations: readonly SqlMigration[], label: string): void => {
  let previousId = 0;
  for (const migration of migrations) {
    if (migration.id <= previousId) {
      throw new Error(`${label} migrations must be ordered by increasing id`);
    }
    previousId = migration.id;
  }
};

const ensureMigrationColumns = (sql: SqlStorage): void => {
  const columns = new Set(
    sql
      .exec<TableColumn>("PRAGMA table_info(_sql_schema_migrations)")
      .toArray()
      .map((column) => column.name),
  );

  if (!columns.has("name")) {
    sql.exec("ALTER TABLE _sql_schema_migrations ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.has("checksum")) {
    sql.exec("ALTER TABLE _sql_schema_migrations ADD COLUMN checksum TEXT");
  }
};

const checksumSql = (sql: string): string => {
  const normalized = sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
