<!--
  This README has TWO modes.

  • Pre-init (template state): describes the template itself.
  • Post-init: describes YOUR project. The init recipe (see `.agents/init.md`)
    rewrites the PROJECT-INTRO block with the user's product description and
    deletes everything inside TEMPLATE-ONLY blocks.

  Sections outside both blocks (Architecture, Local development, Deploy,
  Common tasks, Customizing, License) are preserved as-is — they're useful
  in both modes.
-->

<!-- PROJECT-INTRO:START -->

# cf-bun-template

A Bun monorepo template for Cloudflare Workers + React. Opinionated about
**how** code is organized (namespaces, typed errors, OpenAPI from routes),
unopinionated about **what** you build (no DB locked in, no auth provider
locked in beyond JWT bearer).

> 🟡 **This template is uninitialized.** Open the directory in your AI agent
> and say _"Initialize this template for my project."_ The agent will
> interview you about what you're building and rewrite this section.

<!-- PROJECT-INTRO:END -->

<!-- TEMPLATE-ONLY:START -->

## What you get

- **Backend** (`packages/api/`) — Cloudflare Worker on Hono + hono-openapi.
  Auto-generated OpenAPI spec, typed errors with `NamedError`,
  `AsyncLocalStorage`-based per-request `Instance` context.
- **SDK** (`packages/sdk/`) — TypeScript SDK auto-generated from the API
  OpenAPI spec via `@hey-api/openapi-ts`. Publishable to npm; consumed by the
  web frontend.
- **Frontend** (`packages/web/`) — React 19 + Vite + TailwindCSS v4. Talks to
  the API exclusively through the generated SDK. Served as static assets by
  the same Worker in production.
- **Tooling** — `oxlint` (linting), `oxfmt` (formatting), `tsgo` (fast
  typecheck), `husky` + `lint-staged` (pre-commit).
- **CI** — GitHub Actions for lint/format/typecheck/test/build, Cloudflare
  deploy, and npm SDK publishing.
- **Agent recipes** — `.agents/*.md` files that walk an AI agent through
  initializing the template, adding features, wiring storage, regenerating
  the SDK, etc.

## Quick start

### With an AI agent (recommended)

```bash
git clone <this-template> my-app
cd my-app
```

Open the directory in your favourite agentic IDE / CLI (Claude Code, Cursor,
etc.) and say:

> Initialize this template for my project.

The agent will read [`.agents/init.md`](./.agents/init.md), ask you what
you're building (in your own words), then capture the mechanical setup
details, substitute placeholders, install deps, and run all the checks.

### Manually

```bash
git clone <this-template> my-app
cd my-app

# Replace tokens. Example values shown — pick your own:
APP_NAME=my-app
PKG_SCOPE='@my-app'
WORKER_NAME=my-app
DESCRIPTION='My new app'

# Use sed (BSD on macOS — drop the empty '' after -i for GNU sed):
find . -type f \
  -not -path './node_modules/*' -not -path './.git/*' -not -path './.agents/*' \
  -exec sed -i '' \
    -e "s|{{APP_NAME}}|$APP_NAME|g" \
    -e "s|@app|$PKG_SCOPE|g" \
    -e "s|{{WORKER_NAME}}|$WORKER_NAME|g" \
    -e "s|{{DESCRIPTION}}|$DESCRIPTION|g" \
    {} +

bun install
bun run --filter '*/api' cf-typegen
bun run --filter '*/sdk' build
bun run lint && bun run ts-check && bun run test
rm .agents/init.md   # only useful pre-init
```

Manual mode skips writing the product description — fill in the
PROJECT-INTRO block above and `.agents/PROJECT.md` yourself if you want AI
agents to have project context later.

<!-- TEMPLATE-ONLY:END -->

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
│   │   ├── utils/          # Context, Log, NamedError
│   │   ├── config/         # typed env accessors
│   │   ├── health/         # health endpoint
│   │   └── example/        # reference feature (delete or rename)
│   ├── scripts/            # generate-openapi
│   └── wrangler.jsonc      # Cloudflare config
├── sdk/                    # TypeScript SDK (generated from API OpenAPI)
└── web/                    # React + Vite frontend (delete if API-only)
    └── src/
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
| Regenerate SDK after API   | [`.agents/regenerate-sdk.md`](./.agents/regenerate-sdk.md)          |
| Wire Prisma + Postgres     | [`.agents/add-storage-prisma.md`](./.agents/add-storage-prisma.md)  |
| Wire Cloudflare D1         | [`.agents/add-storage-d1.md`](./.agents/add-storage-d1.md)          |
| Add SIWE/Privy/OAuth       | [`.agents/add-auth-provider.md`](./.agents/add-auth-provider.md)    |

## Local development

```bash
# In one terminal:
bun run --filter '*/api' dev      # wrangler dev on :8787

# In another:
bun run --filter '*/web' dev      # vite on :3002 (proxies /api → :8787)
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

MIT (or whatever you want — edit this section after cloning).
