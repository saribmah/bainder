# Bainder

AI-powered document binder that turns receipts, contracts, and PDFs into
searchable, queryable memory.

## About

Bainder is a personal document binder powered by AI. Drop in any PDF,
receipt, invoice, statement, contract, manual, screenshot, or book —
Bainder extracts structured data, organizes it, and makes it queryable in
plain English. It's not a PDF chat app; it's long-term, AI-ready memory for
your documents.

## What it does

- Ingest mixed document types (PDFs, images, receipts, contracts, manuals, books)
- Extract structured data and metadata from each document
- Organize documents into a searchable, browsable binder
- Answer natural-language questions across the full corpus ("find my Apple receipt", "what does the lease say about pets")
- Summarize long documents and chapters on demand

**For**: individuals and small teams managing personal and professional
document collections.

## Architecture

See [AGENTS.md](./AGENTS.md) for the full architectural rulebook (also read
by every AI agent that touches this repo). High-level:

```
packages/
├── api/                    # Cloudflare Worker
│   ├── src/
│   │   ├── app/            # Hono app composition
│   │   ├── server/         # routes (HTTP transport) + error mapping
│   │   ├── middleware/     # auth, error handler
│   │   ├── instance/       # AsyncLocalStorage request context
│   │   ├── utils/          # Context, Log, NamedError, slug
│   │   ├── config/         # typed env accessors
│   │   ├── health/         # health endpoint
│   │   ├── document/       # document ingest, processing, R2 manifest API
│   │   │   └── formats/    # per-format namespaces (epub today; pdf/article next)
│   │   ├── highlight/      # type-agnostic highlights (sectionKey + position)
│   │   ├── progress/       # type-agnostic reading progress
│   │   ├── user/           # user profile
│   │   └── example/        # reference feature for new contributors
│   ├── migrations/         # drizzle SQL migrations
│   ├── scripts/            # generate-openapi
│   └── wrangler.jsonc      # Cloudflare config (D1, R2, Workflow bindings)
├── sdk/                    # TypeScript SDK (generated from API OpenAPI)
├── ui/                     # shared cross-platform UI primitives
├── testing/                # integration test harness against a live worker
├── web/                    # React 19 + Vite frontend
├── mobile/                 # Expo / React Native client
└── desktop/                # Electrobun desktop client
```

### Backend pattern (per feature)

Each feature is a self-contained namespace. The example below is the
reference shape — clone it for new features.

```
src/<feature>/
  <feature>.ts           # namespace, Entity, errors, operations
  storage.ts             # entitySelect + EntityRow + toEntity + queries
  __tests__/<feature>.test.ts
src/server/routes/<feature>.ts  # router with describeRoute + validator
```

Layering: `routes → feature → storage`, one-way only. Errors are typed
`NamedError` instances mapped to HTTP statuses at the route boundary.

## Common tasks

| Task                       | Recipe                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| Add a feature              | [`.agents/add-feature.md`](./.agents/add-feature.md)                |
| Add a route                | [`.agents/add-route.md`](./.agents/add-route.md)                    |
| Add a document format      | [`.agents/add-format.md`](./.agents/add-format.md)                  |
| Regenerate SDK after API   | [`.agents/regenerate-sdk.md`](./.agents/regenerate-sdk.md)          |
| Wire Prisma + Postgres     | [`.agents/add-storage-prisma.md`](./.agents/add-storage-prisma.md)  |
| Wire Cloudflare D1         | [`.agents/add-storage-d1.md`](./.agents/add-storage-d1.md)          |
| Add SIWE/Privy/OAuth       | [`.agents/add-auth-provider.md`](./.agents/add-auth-provider.md)    |

## Local development

```bash
# In one terminal:
bun run --filter '*/api' dev      # wrangler dev on :8787

# In another, pick whichever client you're working on:
bun run --filter '*/web' dev      # vite (proxies /api → :8787)
bun run --filter '*/mobile' start # expo
bun run --filter '*/desktop' dev  # electrobun
```

The web app's Vite config proxies `/api/*` to the local wrangler dev server,
so the SDK's `baseUrl: "/api"` Just Works in dev.

## Deploy

The repo ships with two GitHub Actions:

- **`deploy.yml`** — deploys the Cloudflare Worker. Requires
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
- **`publish-sdk.yml`** — publishes `@<scope>/sdk` to npm. Requires `NPM_TOKEN`.

Both are **manual-only by default** (`workflow_dispatch`) — they won't run
on push until you uncomment the `push` trigger in each YAML. This avoids
spammy red checks on a fresh clone before secrets are configured.

Manual deploy from your machine:

```bash
bun run --filter '*/api' deploy
```

To enable automatic deploys on merge to `main`, uncomment the `push` block
in `.github/workflows/deploy.yml` (and `publish-sdk.yml` for npm).

## Customizing

- **Add custom domains**: edit the `routes` block in `wrangler.jsonc → env.production`.
- **Add Cloudflare bindings** (KV, R2, D1, Queues, DOs, Workflows): edit
  `wrangler.jsonc` then run `bun run --filter '*/api' cf-typegen` to refresh
  the type definitions.
- **Drop the web frontend**: delete `packages/web/`, remove it from
  `package.json → workspaces`, delete the `assets` block from
  `wrangler.jsonc → env.production`.

## License

MIT. See [LICENSE](./LICENSE).
