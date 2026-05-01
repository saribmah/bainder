import { z } from "zod";
import { Document } from "../document/document";
import { NamedError } from "../utils/error";
import { ProgressStorage } from "./storage";

// Per-user reading position within a document. EPUB rows track the last
// chapter visited; PDF rows track the last page. Updates are upserts —
// there's only ever one row per (user, document).
export namespace Progress {
  // ---- Errors -----------------------------------------------------------
  export const InvalidTargetError = NamedError.create(
    "ProgressInvalidTargetError",
    z.object({
      documentKind: z.string(),
      message: z.string().optional(),
    }),
  );
  export type InvalidTargetError = InstanceType<typeof InvalidTargetError>;

  // ---- Schemas ----------------------------------------------------------
  export const Entity = z
    .object({
      documentId: z.string(),
      epubChapterOrder: z.number().int().nonnegative().nullable(),
      pdfPageNumber: z.number().int().positive().nullable(),
      updatedAt: z.string(),
    })
    .meta({ ref: "Progress" });
  export type Entity = z.infer<typeof Entity>;

  export const UpsertInput = z
    .object({
      epubChapterOrder: z.number().int().nonnegative().optional(),
      pdfPageNumber: z.number().int().positive().optional(),
    })
    .refine(
      (v) =>
        (v.epubChapterOrder !== undefined && v.pdfPageNumber === undefined) ||
        (v.epubChapterOrder === undefined && v.pdfPageNumber !== undefined),
      { message: "Exactly one of epubChapterOrder or pdfPageNumber must be set" },
    );
  export type UpsertInput = z.infer<typeof UpsertInput>;

  // ---- Operations -------------------------------------------------------
  export const upsert = async (
    userId: string,
    documentId: string,
    input: UpsertInput,
  ): Promise<Entity> => {
    // Confirm ownership of the document and that the target field matches
    // the document kind. Missing rows / cross-user reads bubble up as
    // DocumentNotFoundError, same as elsewhere.
    const doc = await Document.get(userId, documentId);

    if (input.epubChapterOrder !== undefined && doc.kind !== "epub") {
      throw new InvalidTargetError({
        documentKind: doc.kind,
        message: "epubChapterOrder is only valid for EPUB documents",
      });
    }
    if (input.pdfPageNumber !== undefined && doc.kind !== "pdf") {
      throw new InvalidTargetError({
        documentKind: doc.kind,
        message: "pdfPageNumber is only valid for PDF documents",
      });
    }

    return ProgressStorage.upsert({
      userId,
      documentId,
      epubChapterOrder: input.epubChapterOrder ?? null,
      pdfPageNumber: input.pdfPageNumber ?? null,
    });
  };
}
