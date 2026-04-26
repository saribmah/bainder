# Regenerate the SDK (recipe)

Use this when API routes or schemas change. The SDK in `packages/sdk/src/v1/gen/`
is generated from `packages/api`'s OpenAPI spec — never edit it manually.

## When to regenerate

- After adding/removing a route
- After changing a request/response schema
- After changing an `operationId`
- After adding/removing a `NamedError` schema referenced in route responses

## Command

From the repo root:

```bash
bun run --filter '*/sdk' build
```

This is what runs:

1. `bun run --filter '*/api' openapi:generate <sdk>/openapi.json`
   — regenerates the OpenAPI spec from the live router
2. `@hey-api/openapi-ts` writes fresh `src/v1/gen/{client,sdk,types}.gen.ts`
3. `lint:fix`, `format:fix`, `ts-check` run inside the SDK package

## Verify

```bash
bun run lint && bun run ts-check
```

If `packages/web` (or any other consumer) breaks, that's the point — the SDK
contract changed and consumers need to be updated. Make those updates in the
same change.

## Important

- `packages/sdk/src/v1/gen/*` is generated. Do not edit it. Do not commit
  hand changes there.
- `packages/sdk/openapi.json` is also generated; commit it so the SDK build
  is reproducible.
- The SDK contract is the public API. Coordinate breaking changes with SDK
  consumers (the `web` package, downstream apps, anyone who installed the
  published npm version).
