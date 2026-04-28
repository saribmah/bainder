import { Database } from "bun:sqlite";
import path from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { AuthContext, RuntimeEnv } from "../../app/context";
import type { Db } from "../../db/db";
import { user } from "../../db/schema";
import { Instance } from "../../instance";

// Bun:sqlite-backed test harness for storage-touching feature tests.
//
// Type cast: Db is the production D1 Drizzle type. The bun-sqlite Drizzle
// instance has the same SQL builder surface (select/insert/update/delete) but
// a different concrete class, so we cast at the boundary. Storage code only
// uses the shared SQLite query builder API — no D1-specific methods like
// `.batch()` — so the cast is safe.
const migrationsFolder = path.resolve(import.meta.dir, "../../../migrations");

export type TestUser = { id: string; name: string; email: string };

export const createTestRuntime = (users: TestUser[]) => {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder });

  const now = new Date();
  for (const u of users) {
    db.insert(user)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const env = { DB: {} as unknown } as RuntimeEnv;

  const runAs = <R>(userId: string, fn: () => R): R => {
    const auth: AuthContext = {
      isAuthenticated: true,
      userId,
      user: null,
      authMethod: "session",
    };
    return Instance.provide({ db: db as unknown as Db, env, auth }, fn);
  };

  const close = () => sqlite.close();

  return { runAs, close };
};
