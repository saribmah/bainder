# Project

This file is the canonical "what is this project" reference. AI agents read
it on every run for context. Keep it current as the project evolves.

It is filled in during template initialization (see [`init.md`](./init.md))
and maintained by the team thereafter.

---

## Identity

- **Name**: Bainder
- **Scope**: `@bainder`
- **Description**: AI-powered document binder that turns receipts, contracts, and PDFs into searchable, queryable memory.
- **Worker name**: `bainder` (dev: `bainder-dev`)
- **Production domain**: _not yet configured — falls back to `bainder.workers.dev`_
- **Web frontend**: yes (`packages/web`)
- **Initialized at**: 2026-04-26

## What it is

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

## Who it's for

Individuals and small teams managing personal and professional document
collections.

## Current focus

- **EPUB ingest scaffold** (`packages/api/src/epub/`): in-memory `Epub` feature
  that parses EPUB bytes (fflate + fast-xml-parser) into book metadata,
  ordered chapters (cleaned HTML + plain text), and a flat TOC, plus a
  `getContext` op that assembles AI-ready text across a chapter range.
  Routes mounted at `/epubs`. Storage is in-memory — wire to R2 (chapter
  blobs) + Postgres/D1 (rows + metadata) when persistence is needed.
- Planned siblings: `pdf`, `receipt`, `image` features — each its own
  self-contained module following the same Entity/storage pattern. A future
  cross-corpus binder/search feature will compose across them.

## Notes

_Past decisions, known issues, deferred work, anything else worth
remembering._
