# @bainder/sdk

TypeScript SDK for the bainder API. Auto-generated from the API's
OpenAPI spec via [`@hey-api/openapi-ts`](https://heyapi.dev/).

## Install

```bash
bun add @bainder/sdk
# or: npm install @bainder/sdk
```

## Usage

```ts
import { createApiClient } from "@bainder/sdk";

const api = createApiClient({
  baseUrl: "https://api.bainder.app",
  // Optional: bearer-token auth
  auth: () => localStorage.getItem("accessToken") ?? undefined,
  security: [{ type: "http", scheme: "bearer" }],
});

// Methods are grouped by feature. Each call returns { data, error, response }.
const health = await api.health.get();
const examples = await api.example.list();
const created = await api.example.create({ name: "hello" });
```

## Regenerate

After backend route or schema changes, regenerate the SDK from repo root:

```bash
bun run --filter '@bainder/sdk' build
```

This:
1. Calls `openapi:generate` in `packages/api` to refresh `openapi.json`
2. Runs `@hey-api/openapi-ts` to regenerate `src/v1/gen/`
3. Runs `lint:fix`, `format:fix`, `ts-check`

The `src/v1/gen/` directory is generated — never edit it manually.

## Build for publishing

```bash
bun run --filter '@bainder/sdk' compile         # outputs to lib/
bun run --filter '@bainder/sdk' prepare-publish # rewrites package.json exports → lib/*
npm publish --access public --ignore-scripts
```

The `publish-sdk.yml` GitHub Action does this automatically when the SDK
package version is bumped on `main`.
