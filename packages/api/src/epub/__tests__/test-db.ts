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

  const env = { DB: {} as unknown, BUCKET: createFakeR2Bucket() } as RuntimeEnv;

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

// In-memory R2Bucket fake. Implements only the surface our storage actually
// uses (put/get/list/delete). The cast at return widens to the full R2Bucket
// type — calling any other method in tests would throw.
const createFakeR2Bucket = (): R2Bucket => {
  const store = new Map<string, { bytes: Uint8Array; contentType: string }>();

  const buildObject = (key: string, item: { bytes: Uint8Array; contentType: string }) => ({
    key,
    version: "v1",
    size: item.bytes.byteLength,
    etag: "etag",
    httpEtag: '"etag"',
    uploaded: new Date(),
    httpMetadata: { contentType: item.contentType },
    customMetadata: {},
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(item.bytes);
        controller.close();
      },
    }),
    bodyUsed: false,
    arrayBuffer: async () => item.bytes.buffer,
    text: async () => new TextDecoder().decode(item.bytes),
  });

  const fake = {
    put: async (
      key: string,
      value: ArrayBuffer | Uint8Array,
      options?: { httpMetadata?: { contentType?: string } },
    ) => {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      const contentType = options?.httpMetadata?.contentType ?? "application/octet-stream";
      store.set(key, { bytes, contentType });
      return { key, size: bytes.byteLength };
    },
    get: async (key: string) => {
      const item = store.get(key);
      return item ? buildObject(key, item) : null;
    },
    list: async (opts?: { prefix?: string; cursor?: string }) => {
      const prefix = opts?.prefix ?? "";
      const objects = [...store.entries()]
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => ({ key: k, size: v.bytes.byteLength }));
      return { objects, truncated: false, delimitedPrefixes: [] };
    },
    delete: async (keys: string | string[]) => {
      const arr = typeof keys === "string" ? [keys] : keys;
      for (const k of arr) store.delete(k);
    },
  };
  return fake as unknown as R2Bucket;
};
