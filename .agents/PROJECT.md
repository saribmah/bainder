# Project

This file is the canonical "what is this project" reference. AI agents read
it on every run for context. Keep it current as the project evolves.

It is filled in during template initialization (see [`init.md`](./init.md))
and maintained by the team thereafter.

---

## Identity

- **Name**: Baindar
- **Scope**: `@baindar`
- **Description**: AI-powered document binder that turns receipts, contracts, and PDFs into searchable, queryable memory.
- **Worker name**: `baindar` (dev: `baindar-dev`)
- **Production domain**: `baindar.com` (API: `api.baindar.com`)
- **Web frontend**: yes (`packages/web`)
- **Initialized at**: 2026-04-26

## What it is

Baindar is a personal document binder powered by AI. Drop in any PDF,
receipt, invoice, statement, contract, manual, screenshot, or book —
Baindar extracts structured data, organizes it, and makes it queryable in
plain English. It's not a PDF chat app; it's long-term, AI-ready memory for
your documents.

## What it does

- Ingest mixed document types (PDFs, images, receipts, contracts, manuals, books)
- Extract structured data and metadata from each document
- Organize documents into a searchable, browsable binder
- Answer natural-language questions across the full corpus ("find my Apple receipt", "what does the lease say about pets")
- Summarize long documents and chapters on demand

## Who it's for

Individuals and small teams managing personal and professional document
collections.

## Current focus

- **Document ingest** (`packages/api/src/document/`): unified `Document`
  feature that owns upload, async processing (Cloudflare Workflow), and a
  type-agnostic reader API. D1 keeps lightweight rows; R2 holds rendered
  content per document at `users/{userId}/documents/{id}/`:
  - `original.{ext}` — raw upload
  - `manifest.json` — canonical index (sections, metadata, TOC) — written
    last; its presence is the source-of-truth that processing succeeded
  - `content/{slug}.html` + `content/{slug}.txt` — per-section render +
    canonical text, slug-prefixed by reading order
  - `assets/*` — extracted images / fonts referenced by content
- **Format dispatch** (`packages/api/src/document/formats/`): one folder
  per format with its parser, namespace, workflow steps, and Cloudflare
  Workflow class colocated. Today only `epub/` is wired:
  `formats/epub/parser.ts` (private), `formats/epub/epub.ts` (`Epub`
  namespace — `parse`, `sectionKey`, errors, manifest schemas),
  `formats/epub/steps.ts` (idempotent step bodies + `runEpubInline`),
  `formats/epub/workflow.ts` (`EpubWorkflow` class). Adding a format means
  one parser + one manifest arm + one workflow + one binding — no new
  routes, no new SDK methods.
- **Processor dispatch** (`packages/api/src/document/processing/`): the
  `Processor` namespace picks the right Workflow binding by `kind`.
  `Document.create` calls `Processor.trigger(kind, id)` after persisting
  the row + original blob; format detection happens in
  `processing/detect.ts` before the trigger fires.
- **Type-agnostic locators** for cross-document features: `highlight` and
  `progress` reference sections by `sectionKey` (e.g. `"epub:section:5"`,
  minted via `Epub.sectionKey(order)`) plus a JSON `position`. Adding a new
  format does not change the highlight/progress schemas.
- **Reader API surface**: `GET /documents/:id/manifest`,
  `GET /documents/:id/sections/:order/{html,text}`, `GET /documents/:id/raw`,
  `GET /documents/:id/{name}` (assets). Same endpoints work for every
  format.
- Planned siblings: `pdf`, `article`, `image` formats — each adds a parser
  and a manifest arm. A future cross-corpus binder/search feature will
  compose across them by reading from R2 in an AI sandbox (no
  embeddings/vectors).

## Notes

_Past decisions, known issues, deferred work, anything else worth
remembering._
