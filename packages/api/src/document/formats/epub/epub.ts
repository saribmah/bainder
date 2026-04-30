import { z } from "zod";
import { NamedError } from "../../../utils/error";

// EPUB-specific schema and errors. The user-visible binder row is
// `Document.Entity`; this namespace only describes the EPUB-specific extension
// (book metadata, chapters, TOC) hung off `epub_book` / `epub_chapter`.
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

  export const ChapterNotFoundError = NamedError.create(
    "EpubChapterNotFoundError",
    z.object({
      documentId: z.string(),
      order: z.number().int(),
      message: z.string().optional(),
    }),
  );
  export type ChapterNotFoundError = InstanceType<typeof ChapterNotFoundError>;

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

  export const Entity = z
    .object({
      documentId: z.string(),
      authors: z.array(z.string()),
      language: z.string(),
      description: z.string().nullable(),
      publisher: z.string().nullable(),
      publishedDate: z.string().nullable(),
      identifiers: z.array(z.string()),
      subjects: z.array(z.string()),
      coverImage: z.string().nullable(),
      chapterCount: z.number().int().nonnegative(),
      wordCount: z.number().int().nonnegative(),
    })
    .meta({ ref: "EpubBook" });
  export type Entity = z.infer<typeof Entity>;

  export const ChapterSummary = z
    .object({
      id: z.string(),
      documentId: z.string(),
      order: z.number().int().nonnegative(),
      href: z.string(),
      title: z.string(),
      wordCount: z.number().int().nonnegative(),
      linear: z.boolean(),
    })
    .meta({ ref: "EpubChapterSummary" });
  export type ChapterSummary = z.infer<typeof ChapterSummary>;

  export const Chapter = z
    .object({
      id: z.string(),
      documentId: z.string(),
      order: z.number().int().nonnegative(),
      href: z.string(),
      title: z.string(),
      html: z.string(),
      text: z.string(),
      wordCount: z.number().int().nonnegative(),
      linear: z.boolean(),
    })
    .meta({ ref: "EpubChapter" });
  export type Chapter = z.infer<typeof Chapter>;

  export const Detail = z
    .object({
      book: Entity,
      toc: z.array(TocItem),
      chapters: z.array(ChapterSummary),
    })
    .meta({ ref: "EpubDetail" });
  export type Detail = z.infer<typeof Detail>;
}
