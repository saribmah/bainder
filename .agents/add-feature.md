# Add a feature module (recipe)

Use this recipe when the user says "add a feature", "add a domain module",
"create a notes/posts/orders module", etc.

The canonical reference is `packages/api/src/example/` + the route at
`packages/api/src/server/routes/example.ts`. Mirror its structure exactly.

## Inputs to confirm with the user

- **Feature name** — singular, lowercase. Example: `note`, `post`, `order`.
- **Public route prefix** — usually plural of the feature name. Example: `/notes`.
- **Fields** — what does the entity carry? (id, plus your fields)
- **Operations** — start with: `list`, `get`, `create`. Add `update`/`delete`/etc as needed.
- **Auth** — does the feature require an authenticated user? (drives `requireAuth` middleware)
- **Storage backend** — in-memory placeholder, or wire to Prisma/D1/Drizzle/KV?

## Files to create

```
packages/api/src/<feature>/
  <feature>.ts           # namespace, Entity, errors, operations
  storage.ts             # entitySelect, EntityRow, toEntity, query functions
  __tests__/<feature>.test.ts   # at least one happy path + one error path
packages/api/src/server/routes/<feature>.ts   # router with describeRoute + validator
```

Then mount the router in `packages/api/src/server/server.ts`:

```ts
import <feature>Router from "./routes/<feature>";
// ...
server.route("/<plural>", <feature>Router);
```

## File templates

Copy from `src/example/example.ts`, `src/example/storage.ts`, and
`src/server/routes/example.ts`. Rename `Example` → `<Feature>`,
`example` → `<feature>`, `Example.NameTakenError` → whatever errors your
domain needs.

## Pattern rules (non-negotiable)

1. **Namespace pattern**: `export namespace <Feature> { ... }` containing
   `Entity`, `Inputs/Outputs`, errors, and operations.
2. **Entity pattern**: every domain feature exports a `<Feature>.Entity` zod
   schema + inferred type. Storage returns `Entity` (or `Entity | null`),
   never raw rows.
3. **Storage shape**: every storage module exports `entitySelect`, `EntityRow`,
   and `toEntity(row): <Feature>.Entity`. Query functions call `toEntity`
   internally.
4. **Errors**: each error condition gets its own `NamedError` class with both
   `const` and `type` exports. Errors live INSIDE the feature namespace, not
   in a separate `errors.ts` file.
5. **One-way deps**: `routes/<feature>.ts → <feature>/<feature>.ts → <feature>/storage.ts`.
   Storage modules MUST NOT import other storage modules. Routes MUST NOT
   import storage directly.
6. **No business logic in storage**: storage modules contain only persistence
   (queries, inserts, transactions, row→entity mapping). Validation,
   authorization, and orchestration live in the feature module.
7. **Errors mapped at the route boundary** via `createErrorMapper` — do not
   try/catch inside feature operations and translate to HTTP statuses there.
8. **Route handlers parse + validate + auth + map** — they accept HTTP, hand
   off to the feature, map errors to status codes, return JSON. Nothing else.
9. **Direct env access**: only inside `src/config/`. Feature modules consume
   `Config.*` accessors. Never `Instance.env.X` from feature code.

## After implementing

```bash
bun run lint
bun run format
bun run ts-check
bun run test
bun run --filter '*/sdk' build               # refresh SDK from API
```

The SDK build call also writes `packages/api/openapi.generated.json` (the
SDK's source) and the SDK's typed methods. Update SDK consumers (`packages/web`)
in the same change if their call sites need to change.

Update `.agents/PROJECT.md` if this feature is significant enough to mention.
