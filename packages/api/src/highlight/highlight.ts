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
      epubChapterOrder: z.number().int().nonnegative(),
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

  export const CreateInput = z
    .object({
      documentId: z.string().min(1),
      epubChapterOrder: z.number().int().nonnegative(),
      offsetStart: z.number().int().nonnegative(),
      offsetEnd: z.number().int().nonnegative(),
      textSnippet: z.string().min(1).max(MAX_SNIPPET_CHARS),
      color: Color,
      note: z.string().max(MAX_NOTE_CHARS).optional(),
    })
    .refine((v) => v.offsetStart <= v.offsetEnd, {
      message: "offsetStart must be <= offsetEnd",
      path: ["offsetEnd"],
    });
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
  });
  export type ListQuery = z.infer<typeof ListQuery>;

  // ---- Operations -------------------------------------------------------
  export const create = async (userId: string, input: CreateInput): Promise<Entity> => {
    // Confirm the document exists and is owned by the caller. Document.get
    // throws NotFoundError for both missing rows and rows owned by another
    // user, which is the right behaviour to surface.
    await Document.get(userId, input.documentId);

    return HighlightStorage.create({
      id: crypto.randomUUID(),
      userId,
      documentId: input.documentId,
      epubChapterOrder: input.epubChapterOrder,
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
