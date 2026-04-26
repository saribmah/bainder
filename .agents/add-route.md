# Add a route to an existing feature (recipe)

Use this when the user says "add an endpoint to X", "add a route for Y",
"expose Z over HTTP".

## Steps

1. Find the existing router: `packages/api/src/server/routes/<feature>.ts`.
2. Add the operation to the feature namespace first
   (`packages/api/src/<feature>/<feature>.ts`) — define inputs/outputs as zod
   schemas, throw typed `NamedError` instances on domain failures.
3. Add the route handler. Required parts:
   - `describeRoute({ summary, operationId, responses })` — `operationId`
     follows `<feature>.<verb>` (e.g. `note.update`, `note.archive`).
   - `validator("json" | "query" | "param", <ZodSchema>)` for any user input.
   - `createErrorMapper([{ error, status }, ...])` listing every domain error
     this route can produce.
   - try/catch — catch, map, return mapped payload + status. Re-throw
     unmapped errors so the global error handler returns 500.
4. If the route mutates data, prefer `POST` for create, `PATCH` for partial
   update, `PUT` for full replace, `DELETE` for delete.
5. Document responses for at least 200/201 and every error status returned.

## Auth

If the route requires an authenticated user, add `requireAuth` from
`../middleware/auth` as middleware:

```ts
exampleRouter.post("/", requireAuth, validator("json", Example.CreateInput), async (c) => {
  // Inside, Instance.userId is available.
});
```

## Verify

```bash
bun run lint && bun run ts-check && bun run test
bun run --filter '*/sdk' build   # regenerates SDK so the new route is callable from web
```
