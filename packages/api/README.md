# @baindar/api

Cloudflare Workers backend built on Hono + hono-openapi.

## Architecture

- **`src/app/`** — Hono app composition, runtime context, base middleware wiring
- **`src/server/`** — Routers (HTTP transport), error mapping, OpenAPI plumbing
- **`src/middleware/`** — Cross-cutting middleware (auth, error handler)
- **`src/instance/`** — Per-request `AsyncLocalStorage` context (`env`, `auth`)
- **`src/utils/`** — Shared utilities (`Context`, `Log`, `NamedError`, slug)
- **`src/config/`** — Typed env-derived configuration accessors
- **`src/db/`** — Drizzle schema (auth tables + `document`, `highlight`, `progress`)
- **`src/health/`** — Health endpoint
- **`src/document/`** — Document ingest, async processing pipeline, R2 manifest API
  - `formats/<fmt>/` — per-format namespace (today: `epub`); each contributes a manifest arm + section-key minter
  - `processing/parsers/` — pure byte → parsed-shape parsers + `detect.ts`
  - `processing/pipeline.ts` — writes manifest + content + assets to R2
  - `asset-store.ts` — R2 layout (`original`, `manifest.json`, `content/`, `assets/`)
- **`src/highlight/`** — Type-agnostic highlights (`sectionKey` + JSON `position`)
- **`src/progress/`** — Type-agnostic reading progress
- **`src/user/`** — User profile
- **`src/example/`** — Reference feature for new contributors

Dependency direction is one-way: `server/routes → feature → storage`. Storage
is the only layer that touches `db`; format directories are
transport-agnostic and never depend on routes or the SDK.

## Adding work

- New feature: [`.agents/add-feature.md`](../../.agents/add-feature.md)
- New route on an existing feature: [`.agents/add-route.md`](../../.agents/add-route.md)
- New document format (PDF, article, image, …): [`.agents/add-format.md`](../../.agents/add-format.md)
- After API contract changes: [`.agents/regenerate-sdk.md`](../../.agents/regenerate-sdk.md)

## Commands

- `bun run dev` — `wrangler dev` against the `dev` env
- `bun run build` — typecheck via tsgo
- `bun run deploy` — `wrangler deploy --env production`
- `bun run cf-typegen` — regenerate `worker-configuration.d.ts` from `wrangler.jsonc`
- `bun run openapi:generate` — write `openapi.generated.json`
- `bun run test` — run the bun test suite
