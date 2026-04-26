# Add Cloudflare D1 (SQLite) storage (recipe)

Use this when the user wants serverless SQLite at the edge. D1 is a great
default for low/medium traffic apps that want zero infra.

## Steps

1. **Create the database**:
   ```bash
   bunx wrangler d1 create <db-name>
   ```
   Note the returned `database_id`.

2. **Wire the binding** in `packages/api/wrangler.jsonc` under both `dev` and
   `production` envs:
   ```jsonc
   "d1_databases": [
     { "binding": "DB", "database_name": "<db-name>", "database_id": "<id>" }
   ]
   ```
   Then `bun run --filter '*/api' cf-typegen`.

3. **Pick a query layer**. Three reasonable options:
   - **Raw `env.DB.prepare(...).bind(...).all()`** — zero deps, full control.
   - **Drizzle** with `drizzle-orm/d1` — typed, lightweight.
   - **Prisma D1 adapter** — consistent with Postgres path; heavier.

4. **For raw D1**, add a `Database` accessor to the request context. In
   `src/instance/index.ts`:
   ```ts
   interface RequestContext {
     db: D1Database;
     auth: AuthContext;
     env: RuntimeEnv;
   }
   ```
   And in `bootstrap.ts`: `await Instance.provide({ db: c.env.DB, ... });`

5. **Schema migrations**: keep `migrations/*.sql` next to the API package and
   apply them via:
   ```bash
   bunx wrangler d1 migrations create <db-name> init
   bunx wrangler d1 migrations apply <db-name>          # production
   bunx wrangler d1 migrations apply <db-name> --local  # local
   ```

6. **Rewrite `example/storage.ts`** to use the chosen query layer. Keep the
   exported surface the same: `entitySelect` (or column list), `EntityRow`,
   `toEntity`, query functions returning `Example.Entity`.

7. **Update CI** (`.github/workflows/ci.yml`) — D1 doesn't need a generate
   step, but add a migration apply step to `deploy.yml`:
   ```yaml
   - name: Apply D1 migrations
     run: bunx wrangler d1 migrations apply <db-name> --remote
   ```

## Notes

- D1 is eventually consistent across regions but strongly consistent within a
  region. Plan reads accordingly.
- Per-request: the `D1Database` binding is reused — no client to construct.
- Storage modules are the only place allowed to touch `Instance.db`.
