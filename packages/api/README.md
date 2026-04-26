# @app/api

Cloudflare Workers backend built on Hono + hono-openapi.

## Architecture

- **`src/app/`** — Hono app composition, runtime context, base middleware wiring
- **`src/server/`** — Routers (HTTP transport), error mapping, OpenAPI plumbing
- **`src/middleware/`** — Cross-cutting middleware (auth, error handler)
- **`src/instance/`** — Per-request `AsyncLocalStorage` context (`env`, `auth`)
- **`src/utils/`** — Shared utilities (`Context`, `Log`, `NamedError`)
- **`src/config/`** — Typed env-derived configuration accessors
- **`src/health/`** — Health endpoint
- **`src/<feature>/`** — Domain feature modules (namespaces). One per business capability.

Dependency direction is one-way: `server/routes → feature → storage`.

## Adding a feature

See [`.agents/add-feature.md`](../../.agents/add-feature.md) at the repo root.

## Commands

- `bun run dev` — `wrangler dev` against the `dev` env
- `bun run build` — typecheck via tsgo
- `bun run deploy` — `wrangler deploy --env production`
- `bun run cf-typegen` — regenerate `worker-configuration.d.ts` from `wrangler.jsonc`
- `bun run openapi:generate` — write `openapi.generated.json`
- `bun run test` — run the bun test suite
