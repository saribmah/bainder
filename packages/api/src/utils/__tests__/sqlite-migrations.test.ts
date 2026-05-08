import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { runSqlMigrations, type SqlMigration } from "../sqlite-migrations";

const createFakeSql = (): { sql: SqlStorage; close: () => void } => {
  const db = new Database(":memory:");
  const sql = {
    exec: (stmt: string, ...args: unknown[]) => {
      if (args.length === 0 && /;\s*\S/m.test(stmt.trim())) {
        db.exec(stmt);
        return makeCursor([]);
      }
      const trimmed = stmt.trim().toLowerCase();
      const isQuery =
        trimmed.startsWith("select") ||
        trimmed.startsWith("with") ||
        trimmed.startsWith("pragma") ||
        / returning /i.test(stmt);
      const prepared = db.prepare(stmt);
      if (isQuery) {
        const rows = prepared.all(...(args as never[]));
        return makeCursor(rows);
      }
      prepared.run(...(args as never[]));
      return makeCursor([]);
    },
  } as unknown as SqlStorage;
  return { sql, close: () => db.close() };
};

const makeCursor = <T>(rows: T[]) => {
  const cursor = {
    [Symbol.iterator]: function* () {
      for (const row of rows) yield row;
    },
    toArray: () => rows,
    one: () => {
      const row = rows[0];
      if (row === undefined) throw new Error("No rows returned");
      return row;
    },
  };
  return cursor as unknown as ReturnType<SqlStorage["exec"]>;
};

const firstMigration: SqlMigration = {
  id: 1,
  name: "initial",
  sql: `
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `,
};

describe("runSqlMigrations", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  test("applies migrations once and records metadata", () => {
    const fake = createFakeSql();
    close = fake.close;

    runSqlMigrations(fake.sql, [firstMigration], "TestStore");
    runSqlMigrations(fake.sql, [firstMigration], "TestStore");

    const migrationRows = fake.sql
      .exec<{ count: number }>("SELECT count(*) AS count FROM _sql_schema_migrations")
      .one();
    expect(migrationRows.count).toBe(1);

    const itemRows = fake.sql.exec<{ count: number }>("SELECT count(*) AS count FROM items").one();
    expect(itemRows.count).toBe(0);
  });

  test("backfills name and checksum for legacy migration rows", () => {
    const fake = createFakeSql();
    close = fake.close;
    fake.sql.exec(`
      CREATE TABLE _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO _sql_schema_migrations(id) VALUES (1);
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    runSqlMigrations(fake.sql, [firstMigration], "TestStore");

    const row = fake.sql
      .exec<{ name: string; checksum: string | null }>(
        "SELECT name, checksum FROM _sql_schema_migrations WHERE id = 1",
      )
      .one();
    expect(row.name).toBe("initial");
    expect(row.checksum).toBeTruthy();
  });

  test("throws when an applied migration changes", () => {
    const fake = createFakeSql();
    close = fake.close;
    runSqlMigrations(fake.sql, [firstMigration], "TestStore");

    const changed: SqlMigration = {
      ...firstMigration,
      sql: `
        CREATE TABLE items (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL
        );
      `,
    };

    expect(() => runSqlMigrations(fake.sql, [changed], "TestStore")).toThrow(
      "TestStore migration 1 (initial) was changed after it was applied",
    );
  });

  test("requires increasing migration ids", () => {
    const fake = createFakeSql();
    close = fake.close;

    expect(() =>
      runSqlMigrations(
        fake.sql,
        [
          { id: 2, name: "second", sql: "CREATE TABLE second (id TEXT PRIMARY KEY);" },
          firstMigration,
        ],
        "TestStore",
      ),
    ).toThrow("TestStore migrations must be ordered by increasing id");
  });
});
