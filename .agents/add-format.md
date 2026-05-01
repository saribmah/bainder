# Add a document format (recipe)

Use this recipe when the user says "add PDF support", "re-add image support",
"add support for .docx", etc. Bainder is currently EPUB-only by design;
formats are reintroduced one at a time so each addition lands tested and
contained.

The canonical reference is `packages/api/src/document/formats/epub/` plus
the parser at `packages/api/src/document/processing/parsers/epub.ts`. Mirror
its structure exactly.

## Inputs to confirm with the user

- **Format name** — singular, lowercase. Example: `pdf`, `image`, `text`.
- **MIME type(s)** and **file extension(s)** the format accepts.
- **Magic-byte signature** (if any) the detector should match.
- **Position model** — does the format have an in-document position concept?
  EPUB uses chapter order; PDF would use page number; an image has no
  position. This drives schema additions on `highlight` / `progress`.
- **Detail shape** — what does the reader UI need? (e.g. PDF: page count +
  per-page text. Image: width/height/format.)
- **Parser dep** — third-party library required (e.g. `unpdf` for PDF). Bun
  Workers compatibility matters.

## Step 1 — Parser

Add `packages/api/src/document/processing/parsers/<fmt>.ts` exporting a
pure `parse<Fmt>Bytes(bytes: Uint8Array)` that returns the canonical
parsed shape (or throws `ParseFailure` on malformed input — see how
`parsers/epub.ts` does it).

Update `parsers/detect.ts` to recognise the format:

- Add a magic-byte signature in `matchSignature` if applicable.
- Add the file extension(s) to the extension match.
- Add the MIME type(s) to the MIME match.
- Return `{ kind: "<fmt>", mimeType: "<canonical-mime>" }`.

## Step 2 — Feature directory

Create `packages/api/src/document/formats/<fmt>/`:

```
<fmt>/<fmt>.ts        # namespace: Entity, Detail, errors
<fmt>/storage.ts      # entitySelect, EntityRow, toEntity, queries
```

Errors live inside the namespace (e.g. `Pdf.PageNotFoundError`,
`Pdf.InvalidFormatError`). Storage returns `Entity` types, never raw rows.

## Step 3 — Pipeline dispatch

Wire the format into `packages/api/src/document/processing/pipeline.ts`:

- Import the parser and the format storage.
- Add a `process<Fmt>` function that parses, persists detail rows, and
  returns the title (or null) for `markProcessed`.
- Add a switch arm on `row.kindParsed`.

## Step 4 — Document namespace

In `packages/api/src/document/document.ts`:

- Add `<fmt>` to the `Kind` enum.
- Add format-specific accessors (e.g. `getPdfDetail`, `getPdfPage`)
  modelled on `getEpubDetail` / `getEpubChapter`. Use the existing
  `getProcessed(userId, id, expected)` helper.

## Step 5 — DB schema + migration

Add `packages/api/src/db/schema/<fmt>.ts` with the format's detail
table(s) — keep the EPUB shape (`epub_book` + `epub_chapter`) as the
template. Re-export from `db/schema/index.ts`.

If the format has a position concept, extend `highlight` / `progress`:

- Add a nullable column (e.g. `pdfPageNumber: integer("pdf_page_number")`).
- If the codebase has more than one position-bearing format active, add a
  CHECK constraint that exactly one position column is non-null per row
  (the historical XOR pattern). With one format only, leave the column
  required (`.notNull()`) and skip the XOR.
- Update `Highlight.Entity` / `Progress.Entity` schemas, the storage
  modules (`highlight/storage.ts`, `progress/storage.ts`), and the route
  query parsing accordingly.

Generate a migration:

```bash
bun run --filter '*/api' db:generate
bun run --filter '*/api' db:reset:local   # if you don't need existing data
```

## Step 6 — Routes

In `packages/api/src/server/routes/document.ts`:

- Add format-specific endpoints (e.g. `GET /:id/<fmt>`, `GET /:id/<fmt>/...`)
  with `describeRoute` + `operationId: "document.get<Fmt>Detail"`.
- Reuse the `formatErrorMappings` array at the bottom of the file.
- Map any format-specific errors (`Pdf.PageNotFoundError`, etc.) at the
  route boundary via `createErrorMapper`.

## Step 7 — Tests

- `packages/api/src/document/__tests__/document.test.ts` — at least one
  happy-path upload+process test for the new format, plus the
  rejects-the-wrong-mime negative path.
- If you touched `highlight` / `progress`, update those tests too.
- `packages/testing/src/lib/fixtures.ts` — add a `build<Fmt>()` fixture.
- `packages/testing/src/__tests__/document.test.ts` — integration test
  exercising upload → workflow → format detail endpoints.

## Step 8 — Regenerate SDK + update clients

```bash
bun run --filter '*/sdk' build
```

Then update each client in lockstep (web, mobile, desktop):

- **Library upload surface**: extend `KIND_LABEL`, `KIND_GRADIENT`/`KIND_BG`,
  `ACCEPT_ATTR` (web/desktop) or DocumentPicker `type` (mobile).
- **Reader dispatch**: add a `<Fmt>Body` component that calls the new SDK
  methods, alongside the existing `EpubBody`. Branch on `doc.kind`.
- **Highlight layer**: if the format has a position concept and you want
  highlights on it, extend `useHighlightLayer` / `useReaderHighlights` so
  `target` is a discriminated union again (see git history pre-EPUB-only
  cut for the shape).
- **Progress upsert**: pass the right position field for the format.

## Verification (run from repo root)

```bash
bun run lint
bun run format
bun run ts-check
bun run test
bun run --filter '*/sdk' build   # idempotent re-check
```

UI changes need a manual smoke test in the browser/simulator — type
checking doesn't catch broken render paths.

## Pattern rules (non-negotiable)

1. **One format per change.** Don't add two formats in one PR; each gets
   its own contained, tested change.
2. **Detection is the gate.** A format is "supported" only after its
   detector arm is in `parsers/detect.ts`. Until then, the gate rejects
   it with `UnsupportedFormatError` → 415.
3. **No reverse deps.** `formats/<fmt>/` depends on `document/`, never
   the other way. The `document` namespace dispatches into formats; it
   doesn't know format internals.
4. **Errors live with the format.** `Pdf.PageNotFoundError` lives in
   `formats/pdf/pdf.ts`, not in a shared errors module.
5. **Schema before code.** Add the DB table + migration before the
   storage module so drizzle types line up.
6. **SDK is downstream.** Never edit `packages/sdk/src/v1/gen/*` by
   hand — regenerate via `bun run --filter '*/sdk' build`.
