import { z } from "zod";
import { Document } from "../document/document";
import { NamedError } from "../utils/error";
import { HighlightStorage } from "./storage";

// User annotations on a document. A "highlight" with a non-null `note` is
// what the UI surfaces as a note; structurally they're the same row.
export namespace Highlight {
  // ---- Errors -----------------------------------------------------------
  export const NotFoundError = NamedError.create(
    "HighlightNotFoundError",
    z.object({ id: z.string(), message: z.string().optional() }),
  );
  export type NotFoundError = InstanceType<typeof NotFoundError>;

  export const InvalidTargetError = NamedError.create(
    "HighlightInvalidTargetError",
    z.object({
      documentKind: z.string(),
      message: z.string().optional(),
    }),
  );
  export type InvalidTargetError = InstanceType<typeof InvalidTargetError>;

  // ---- Schemas ----------------------------------------------------------
  export const Color = z.enum(["pink", "yellow", "green", "blue", "purple"]);
  export type Color = z.infer<typeof Color>;

  // Hard-cap snippet/note length so a malicious caller can't pin huge blobs
  // of text into the row. Values picked to comfortably cover one chapter
  // page worth of selection and a long-form note.
  const MAX_SNIPPET_CHARS = 4_000;
  const MAX_NOTE_CHARS = 10_000;

  export const Entity = z
    .object({
      id: z.string(),
      documentId: z.string(),
      epubChapterOrder: z.number().int().nonnegative().nullable(),
      pdfPageNumber: z.number().int().positive().nullable(),
      offsetStart: z.number().int().nonnegative(),
      offsetEnd: z.number().int().nonnegative(),
      textSnippet: z.string(),
      color: Color,
      note: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .meta({ ref: "Highlight" });
  export type Entity = z.infer<typeof Entity>;

  export const ListResponse = z.object({ items: z.array(Entity) });
  export type ListResponse = z.infer<typeof ListResponse>;

  // Exactly one of `epubChapterOrder` / `pdfPageNumber` must be present —
  // checked at the route level (zod) and again at the storage CHECK.
  export const CreateInput = z
    .object({
      documentId: z.string().min(1),
      epubChapterOrder: z.number().int().nonnegative().optional(),
      pdfPageNumber: z.number().int().positive().optional(),
      offsetStart: z.number().int().nonnegative(),
      offsetEnd: z.number().int().nonnegative(),
      textSnippet: z.string().min(1).max(MAX_SNIPPET_CHARS),
      color: Color,
      note: z.string().max(MAX_NOTE_CHARS).optional(),
    })
    .refine((v) => v.offsetStart <= v.offsetEnd, {
      message: "offsetStart must be <= offsetEnd",
      path: ["offsetEnd"],
    })
    .refine(
      (v) =>
        (v.epubChapterOrder !== undefined && v.pdfPageNumber === undefined) ||
        (v.epubChapterOrder === undefined && v.pdfPageNumber !== undefined),
      { message: "Exactly one of epubChapterOrder or pdfPageNumber must be set" },
    );
  export type CreateInput = z.infer<typeof CreateInput>;

  export const UpdateInput = z
    .object({
      color: Color.optional(),
      note: z.string().max(MAX_NOTE_CHARS).nullable().optional(),
    })
    .refine((v) => v.color !== undefined || v.note !== undefined, {
      message: "At least one of color or note must be provided",
    });
  export type UpdateInput = z.infer<typeof UpdateInput>;

  export const ListQuery = z.object({
    documentId: z.string().min(1),
    epubChapterOrder: z.number().int().nonnegative().optional(),
    pdfPageNumber: z.number().int().positive().optional(),
  });
  export type ListQuery = z.infer<typeof ListQuery>;

  // ---- Operations -------------------------------------------------------
  export const create = async (userId: string, input: CreateInput): Promise<Entity> => {
    // Confirm the document exists and is owned by the caller. Document.get
    // throws NotFoundError for both missing rows and rows owned by another
    // user, which is the right behaviour to surface.
    const doc = await Document.get(userId, input.documentId);

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

    return HighlightStorage.create({
      id: crypto.randomUUID(),
      userId,
      documentId: input.documentId,
      epubChapterOrder: input.epubChapterOrder ?? null,
      pdfPageNumber: input.pdfPageNumber ?? null,
      offsetStart: input.offsetStart,
      offsetEnd: input.offsetEnd,
      textSnippet: input.textSnippet,
      color: input.color,
      note: input.note ?? null,
    });
  };

  export const list = async (userId: string, query: ListQuery): Promise<Entity[]> => {
    // Ownership check via Document.get: same NotFoundError semantics as
    // above. Avoids returning an empty list for an unauthorised request.
    await Document.get(userId, query.documentId);
    return HighlightStorage.list(userId, query);
  };

  export const update = async (userId: string, id: string, patch: UpdateInput): Promise<Entity> => {
    const updated = await HighlightStorage.update(id, userId, {
      color: patch.color,
      // null vs undefined is meaningful: undefined leaves note alone, null
      // clears it. Passed straight through to the storage layer.
      note: patch.note,
    });
    if (!updated) throw new NotFoundError({ id });
    return updated;
  };

  export const remove = async (userId: string, id: string): Promise<void> => {
    const removed = await HighlightStorage.remove(id, userId);
    if (!removed) throw new NotFoundError({ id });
  };
}
