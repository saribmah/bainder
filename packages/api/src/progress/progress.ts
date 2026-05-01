import { z } from "zod";
import { Document } from "../document/document";
import { ProgressStorage } from "./storage";

// Per-user reading position within a document. Tracks the last EPUB chapter
// visited. Updates are upserts — there's only ever one row per
// (user, document).
export namespace Progress {
  // ---- Schemas ----------------------------------------------------------
  export const Entity = z
    .object({
      documentId: z.string(),
      epubChapterOrder: z.number().int().nonnegative(),
      updatedAt: z.string(),
    })
    .meta({ ref: "Progress" });
  export type Entity = z.infer<typeof Entity>;

  export const UpsertInput = z.object({
    epubChapterOrder: z.number().int().nonnegative(),
  });
  export type UpsertInput = z.infer<typeof UpsertInput>;

  // ---- Operations -------------------------------------------------------
  export const upsert = async (
    userId: string,
    documentId: string,
    input: UpsertInput,
  ): Promise<Entity> => {
    // Confirm ownership of the document. Missing rows / cross-user reads
    // bubble up as DocumentNotFoundError, same as elsewhere.
    await Document.get(userId, documentId);

    return ProgressStorage.upsert({
      userId,
      documentId,
      epubChapterOrder: input.epubChapterOrder,
    });
  };
}
