# Add Prisma + Postgres (Hyperdrive) storage (recipe)

Use this when the user wants to swap the in-memory `Map` storage for a real
database. This recipe wires Prisma against a Cloudflare Hyperdrive-backed
Postgres connection.

## Steps

1. **Install deps in the API package:**
   ```bash
   bun add --filter '*/api' @prisma/client @prisma/adapter-pg pg
   bun add --filter '*/api' --dev prisma @types/pg
   ```

2. **Create `packages/api/prisma/schema.prisma`:**
   ```prisma
   generator client {
     provider        = "prisma-client-js"
     output          = "../generated/prisma"
     previewFeatures = ["postgresqlExtensions"]
   }

   datasource db {
     provider = "postgresql"
   }

   // Add your models here. Example for the Example feature:
   model Example {
     id        String   @id @default(uuid(7)) @db.Uuid
     name      String   @unique
     createdAt DateTime @default(now())

     @@map("examples")
   }
   ```

3. **Create `packages/api/prisma.config.ts`:**
   ```ts
   import { defineConfig } from "prisma/config";
   export default defineConfig({
     schema: "prisma/schema.prisma",
   });
   ```

4. **Create `packages/api/src/db/db.ts`:**
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   import { PrismaClient } from "../../generated/prisma/client";
   import type { RuntimeEnv } from "../app/context";

   export type { PrismaClient };

   export function createPrismaClient(hyperdrive: Hyperdrive): PrismaClient {
     const adapter = new PrismaPg({ connectionString: hyperdrive.connectionString });
     return new PrismaClient({ adapter });
   }

   export function createPrismaClientFromConnectionString(connectionString: string): PrismaClient {
     const adapter = new PrismaPg({ connectionString });
     return new PrismaClient({ adapter });
   }

   export function getPrismaClient(env: RuntimeEnv): PrismaClient {
     return createPrismaClient(env.HYPERDRIVE);
   }
   ```

5. **Add `db` to the request context.** In `src/instance/index.ts`:
   ```ts
   import type { PrismaClient } from "../db/db";

   interface RequestContext {
     db: PrismaClient;
     auth: AuthContext;
     env: RuntimeEnv;
   }

   export const Instance = {
     // ...existing...
     get db() { return context.use().db; },
   };
   ```

   In `src/instance/bootstrap.ts`, build the client and inject it:
   ```ts
   import { getPrismaClient } from "../db/db";
   // inside bootstrap: const db = getPrismaClient(c.env);
   await Instance.provide({ db, auth: ..., env: c.env }, async () => { ... });
   ```

6. **Update `wrangler.jsonc`** in both `dev` and `production` envs:
   ```jsonc
   "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<your-hyperdrive-id>" }]
   ```
   Then `bun run --filter '*/api' cf-typegen`.

7. **Rewrite `src/example/storage.ts`** to use Prisma:
   ```ts
   import type { Prisma } from "../../generated/prisma";
   import { Instance } from "../instance";
   import type { Example } from "./example";

   export namespace ExampleStorage {
     export const entitySelect = {
       id: true,
       name: true,
       createdAt: true,
     } satisfies Prisma.ExampleSelect;

     export type EntityRow = Prisma.ExampleGetPayload<{ select: typeof entitySelect }>;

     export const toEntity = (row: EntityRow): Example.Entity => ({
       id: row.id,
       name: row.name,
       createdAt: row.createdAt.toISOString(),
     });

     export const get = async (id: string): Promise<Example.Entity | null> => {
       const row = await Instance.db.example.findUnique({ where: { id }, select: entitySelect });
       return row ? toEntity(row) : null;
     };

     // ...etc
   }
   ```

8. **Add scripts** to `packages/api/package.json`:
   ```json
   "generate": "bunx --bun prisma generate",
   "migrate:dev": "bunx --bun prisma migrate dev",
   "migrate": "bunx --bun prisma migrate deploy"
   ```

9. **CI**: add `bun run --filter '*/api' generate` before lint/ts-check in
   `.github/workflows/ci.yml`. Add `bun run --filter '*/api' migrate` before
   the deploy step in `.github/workflows/deploy.yml`.

10. **Run** locally:
    ```bash
    bun install
    bun run --filter '*/api' generate
    bun run --filter '*/api' migrate:dev --name init
    bun run lint && bun run ts-check && bun run test
    ```

## Notes

- Hyperdrive connection strings are configured in the Cloudflare dashboard or
  via `wrangler hyperdrive create`. Local dev needs `DATABASE_URL` set in `.env`.
- Storage modules read from `Instance.db` — they are the only place allowed to.
- Direct `Instance.db` access from routes or feature modules is a layering
  violation per `AGENTS.md`.
