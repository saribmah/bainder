import { z } from "zod";
import { NamedError } from "../../../utils/error";

// EPUB-specific schema and errors. Reader-side metadata for an EPUB lives
// inside the document's `manifest.json` in R2 (see `Document.Manifest`); D1
// keeps only the queryable bits on `document` itself (title, cover_image).
//
// This namespace exposes:
//   - the EPUB arm of the manifest discriminated union
//   - the section-key minting helper used by the pipeline + highlight code
//   - parser-failure errors raised during ingest
export namespace Epub {
  // ---- Errors -----------------------------------------------------------
  export const InvalidFormatError = NamedError.create(
    "EpubInvalidFormatError",
    z.object({ reason: z.string() }),
  );
  export type InvalidFormatError = InstanceType<typeof InvalidFormatError>;

  export const EmptyError = NamedError.create(
    "EpubEmptyError",
    z.object({ message: z.string().optional() }),
  );
  export type EmptyError = InstanceType<typeof EmptyError>;

  // ---- Section key ------------------------------------------------------
  // The pipeline mints section keys from the chapter order; readers
  // reconstruct the same key when scoping highlight queries to the current
  // section. Keep this helper as the only producer so the format stays the
  // sole authority on its key shape.
  export const sectionKey = (order: number): string => `epub:section:${order}`;

  // ---- Schemas ----------------------------------------------------------
  // TOC is exposed as a flat list with depth + parent pointers so the OpenAPI
  // schema stays non-recursive (recursive zod schemas don't survive the
  // hono-openapi → @hey-api/openapi-ts pipeline cleanly). Callers can rebuild
  // the tree from `parent` if needed.
  export const TocItem = z
    .object({
      index: z.number().int().nonnegative(),
      parent: z.number().int().nonnegative().nullable(),
      depth: z.number().int().nonnegative(),
      title: z.string(),
      href: z.string(),
      fileHref: z.string(),
      anchor: z.string(),
    })
    .meta({ ref: "EpubTocItem" });
  export type TocItem = z.infer<typeof TocItem>;

  // EPUB-specific block within `Document.Manifest`. Type-agnostic fields
  // (title, language, sections[], etc.) live on the base manifest.
  export const ManifestMetadata = z
    .object({
      authors: z.array(z.string()),
      description: z.string().nullable(),
      publisher: z.string().nullable(),
      publishedDate: z.string().nullable(),
      identifiers: z.array(z.string()),
      subjects: z.array(z.string()),
    })
    .meta({ ref: "EpubManifestMetadata" });
  export type ManifestMetadata = z.infer<typeof ManifestMetadata>;
}
