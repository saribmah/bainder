# Add a document format (recipe)

Use this recipe when the user says "add PDF support", "re-add image
support", "add support for .docx", etc. Bainder is currently EPUB-only by
design; formats are reintroduced one at a time so each addition lands
tested and contained.

The canonical reference is `packages/api/src/document/formats/epub/` plus
the parser at `packages/api/src/document/processing/parsers/epub.ts` and
the EPUB branch of `processing/pipeline.ts`. Mirror that structure exactly.

## What "supporting a format" means here

- Reader API stays type-agnostic. `GET /documents/:id/manifest` and
  `GET /documents/:id/sections/:order/{html,text}` already serve every
  format. **Do not add format-specific routes or SDK methods.**
- D1 stays lightweight. `document`, `highlight`, and `progress` already
  cover every format; `highlight`/`progress` use a type-agnostic locator
  (`section_key` + JSON `position`). **Do not add format-specific tables
  or columns.**
- A format contributes:
  1. A **parser** that turns bytes into per-section html/text + assets +
     metadata.
  2. A **manifest arm** added to the `Document.Manifest` discriminated
     union (`kind: "<fmt>"` + format-specific metadata fields).
  3. A **pipeline branch** that calls the parser, writes content/assets/
     manifest to R2, and returns the title/coverImage hoisted onto the
     document row.
  4. A **section-key minter** so highlights/progress can scope to a
     section without leaking format internals.

## Inputs to confirm with the user

- **Format name** — singular, lowercase (e.g. `pdf`, `image`, `article`).
- **MIME type(s)** and **file extension(s)** the format accepts.
- **Magic-byte signature** (if any) the detector should match.
- **Section model** — what is a "section" for this format? EPUB uses
  chapters; PDF would use pages; an image is a single section. Sections
  must have a stable `order` (zero-based) for the section-key scheme.
- **Manifest metadata** — what format-specific fields belong in the
  manifest arm? (e.g. PDF: page count, dimensions; article: byline, source
  URL; image: width/height/format.)
- **Parser dep** — third-party library required (e.g. `unpdf` for PDF).
  Bun + Cloudflare Workers compatibility matters.

## Step 1 — Parser (private to the format)

Add `packages/api/src/document/formats/<fmt>/parser.ts` exporting a pure
`parse<Fmt>Bytes(bytes: Uint8Array)` that returns the canonical parsed
shape (or throws an internal `ParseFailure` sentinel on malformed input —
see how `formats/epub/parser.ts` does it).

The parser's return shape should give the workflow what it needs to write
manifest + content + assets:

- An ordered list of sections, each with `order`, `title`, `wordCount`,
  rendered `html`, plain `text`, and (where applicable) format-specific
  fields like EPUB's `linear` and `href`.
- A list of assets (`{ name, bytes, contentType }`) referenced by the
  rendered html.
- Top-level metadata (title, language, cover image path, plus
  format-specific fields).

Update `processing/detect.ts` to recognise the format:

- Add a magic-byte signature in `matchSignature` if applicable.
- Add the file extension(s) to the extension match.
- Add the MIME type(s) to the MIME match.
- Return `{ kind: "<fmt>", mimeType: "<canonical-mime>" }`.

## Step 2 — Format namespace

Create `packages/api/src/document/formats/<fmt>/<fmt>.ts` exporting a
namespace with:

- **`parse(bytes)`** — re-export the parser as `<Fmt>.parse` so consumers
  reach the parser through the namespace, not via `./parser` directly.
  Mirror `Epub.parse`.
- **Errors** scoped to the format (e.g. `Pdf.InvalidFormatError`,
  `Pdf.EmptyError`). Keep them inside the namespace, not in a shared
  errors module.
- **`sectionKey(order: number) => string`** — the only producer of the
  format's section-key shape. EPUB uses `epub:section:${order}`; pick a
  matching `${kind}:section:${order}` form unless the format genuinely
  needs a different shape. The reader/highlight code calls this same
  helper to scope queries.
- **Manifest schemas** — a `<Fmt>.ManifestMetadata` zod with the
  format-specific fields, plus any nested types (e.g. `Epub.TocItem`).
  Use `.meta({ ref: "<Fmt>ManifestMetadata" })` so the OpenAPI codegen
  produces a named component.

Do not create `formats/<fmt>/storage.ts` — formats don't have D1 tables.

## Step 3 — Manifest arm

In `packages/api/src/document/document.ts`:

- Add `<fmt>` to the `Kind` enum.
- Add a manifest arm that extends `ManifestBase`:
  ```ts
  export const PdfManifest = ManifestBase.extend({
    kind: z.literal("pdf"),
    metadata: Pdf.ManifestMetadata,
    // any other format-specific fields (e.g. pageDimensions)
  }).meta({ ref: "PdfManifest" });
  export type PdfManifest = z.infer<typeof PdfManifest>;
  ```
- Add the new arm to the `Manifest` discriminated union:
  ```ts
  export const Manifest = z
    .discriminatedUnion("kind", [EpubManifest, PdfManifest])
    .meta({ ref: "DocumentManifest" });
  ```

`Document.SectionSummary` is already type-agnostic — every format reuses
it. Don't redefine it per format.

## Step 4 — Workflow steps + class

Each format owns a Cloudflare Workflow. Mirror the EPUB layout:

- `formats/<fmt>/steps.ts` — pure step bodies + `run<Fmt>Inline` for tests.
  No `cloudflare:workers` import here so the unit-test runtime can load it.
- `formats/<fmt>/workflow.ts` — `<Fmt>Workflow` class extending
  `WorkflowEntrypoint`, importing the step bodies and stitching them with
  `step.do(...)` checkpoints.

Step bodies (idempotent, returning small JSON-serializable values so
checkpoint state stays bounded):

1. **`loadDocument(documentId)`** — Read D1 row, assert `kind === "<fmt>"`,
   return `{ userId, originalKey }`.
2. **`resetRendered(userId, documentId)`** — Idempotent R2 sweep
   (`removeRendered` preserves `original.*`).
3. **`parseAndRender(userId, documentId, originalKey)`** — Read original
   bytes, call `<Fmt>.parse`, map `ParseFailure` to
   `<Fmt>.InvalidFormatError`, write image assets via
   `DocumentAssetStore.putAsset`, write per-section
   `content/${padOrder(order)}-${slugify(title, ...)}.{html,txt}` via
   `DocumentAssetStore.putContent`. Build and return the
   `<Fmt>Manifest`-shaped payload.
4. **`writeManifest(userId, documentId, manifest)`** — Persist `manifest.json`
   via `DocumentAssetStore.putManifest`. Return `{ title, coverImage }` for
   the next step.
5. **`markProcessed(documentId, finalized)`** — Update the D1 row to
   `processed` with `title` + `coverImage`.

Plus `recordFailure(documentId, error)` for the catch-all → `markFailed`.
And `run<Fmt>Inline(documentId)` — the inline version that calls steps 1-5
in sequence, wrapping with try/catch + recordFailure to mirror the
class's end-state semantics. Tests use this through the fake binding.

The Workflow class itself is small: it only stitches the steps with
`step.do(name, retryPolicy, () => provide(() => stepFn(...)))`. Pick
retry/timeout policies that reflect the step's failure mode (transient
binding I/O = more retries with short backoff; deterministic parse =
fewer retries with longer backoff). Reuse the EPUB policies as a starting
point.

## Step 5 — Wire the workflow binding + dispatcher

For each new Workflow class you need three small wirings:

1. **`wrangler.jsonc`** — add a workflows entry in BOTH `env.dev` and
   `env.production`:
   ```jsonc
   {
     "binding": "<FMT>_PROCESSOR",
     "name": "bainder-<fmt>-processor",       // and -dev for the dev env
     "class_name": "<Fmt>Workflow"
   }
   ```
2. **`packages/api/src/index.ts`** — export the class so wrangler can
   resolve `class_name`:
   ```ts
   export { PdfWorkflow } from "./document/formats/pdf/workflow";
   ```
3. **`packages/api/src/document/processing/processor.ts`** — add an arm to
   `Processor.bindingFor`:
   ```ts
   case "pdf": return Instance.env.PDF_PROCESSOR;
   ```

Then run `bun run --filter '*/api' cf-typegen` to refresh
`worker-configuration.d.ts`.

In the test runtime (`packages/api/src/document/__tests__/test-db.ts`),
add the new binding to the fake env so `Processor.trigger` resolves:
```ts
const env = {
  // ...
  EPUB_PROCESSOR: createFakeEpubProcessor(),
  PDF_PROCESSOR: createFakePdfProcessor(),  // mirrors the EPUB fake, calls runPdfInline
} as RuntimeEnv;
```

## Step 6 — Tests

- `packages/api/src/document/__tests__/document.test.ts` — at least one
  happy-path upload+process test for the new format that asserts:
  - `manifest.kind === "<fmt>"`
  - section count + a sample section's `sectionKey` shape
  - `getSectionHtml` / `getSectionText` round-trip a known string
- `packages/api/src/document/__tests__/test-db.ts` — register the fake
  binding (Step 5) and extend the fake R2 if your parser needs an asset
  shape it doesn't already handle.
- `packages/testing/src/lib/fixtures.ts` — add a `build<Fmt>()` fixture.
- `packages/testing/src/__tests__/document.test.ts` — integration test
  that uploads the new format, waits for processed, fetches the manifest,
  and reads back at least one section.
- Negative path: `processing/detect.ts` rejects malformed bytes →
  `UnsupportedFormatError` → 415.

If you change `Document.Manifest`, regenerate the SDK in the same change
(see Step 7).

## Step 7 — Regenerate SDK + smoke clients

```bash
bun run --filter '*/sdk' build
```

Generated types now include the new manifest arm. The reader code on
each client should already render any format whose manifest passes the
`Document.Manifest` schema, but check:

- **Library upload surface** (web/desktop/mobile): extend `KIND_LABEL`,
  `KIND_GRADIENT` / `KIND_BG`, `ACCEPT_ATTR` (web/desktop) or DocumentPicker
  `type` (mobile) so users can actually pick the format.
- **Reader dispatch**: if your format needs different rendering than the
  EPUB reader (e.g. PDF page canvas vs HTML stream), branch on
  `manifest.kind` inside the reader feature. Otherwise the existing
  manifest + section-stream flow renders the new format unchanged.
- **TOC/navigation UI**: if the format has a meaningful TOC concept that
  isn't carried in `manifest.sections` (rare — most formats can map their
  navigation onto sections), surface the format-specific manifest fields
  inside the format's reader branch.

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
   detector arm is in `processing/detect.ts`. Until then, the gate rejects
   it with `UnsupportedFormatError` → 415.
3. **No format-specific routes.** The reader API
   (`/manifest`, `/sections/:order/html|text`, `/raw`, `/:name`) is the
   public surface for every format. If a new format genuinely needs
   format-specific data, add it to that format's manifest arm — not as a
   new endpoint.
4. **No format-specific D1 tables.** Lightweight rows only. Format
   content lives in R2 under the document prefix.
5. **No format-specific highlight/progress fields.** Highlights and
   progress are scoped via `sectionKey` (minted by the format's
   `sectionKey()` helper) + JSON `position`. If a position concept
   doesn't fit the existing JSON shape, evolve `Position` in
   `highlight.ts` / `progress.ts` to be a discriminated union — don't
   add columns.
6. **No reverse deps.** `formats/<fmt>/` depends on `document/`, never
   the other way. The `document` namespace dispatches into formats; it
   doesn't know format internals.
7. **Errors live with the format.** `Pdf.PageNotFoundError` lives in
   `formats/pdf/pdf.ts`, not in a shared errors module.
8. **Manifest LAST in the pipeline.** Content + assets first, then
   manifest. Its presence is the success signal. Reprocesses can rely on
   `removeRendered` wiping a partial run cleanly.
9. **SDK is downstream.** Never edit `packages/sdk/src/v1/gen/*` by
   hand — regenerate via `bun run --filter '*/sdk' build`.
