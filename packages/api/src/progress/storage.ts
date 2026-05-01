import { progress } from "../db/schema";
import { Instance } from "../instance";
import type { Progress } from "./progress";

// D1-backed `progress` store. Keyed by composite (userId, documentId);
// upsert overwrites in place via ON CONFLICT.
export namespace ProgressStorage {
  export type EntityRow = {
    userId: string;
    documentId: string;
    epubChapterOrder: number;
    updatedAt: Date;
  };

  export const toEntity = (row: EntityRow): Progress.Entity => ({
    documentId: row.documentId,
    epubChapterOrder: row.epubChapterOrder,
    updatedAt: row.updatedAt.toISOString(),
  });

  export type UpsertInput = {
    userId: string;
    documentId: string;
    epubChapterOrder: number;
  };

  export const upsert = async (input: UpsertInput): Promise<Progress.Entity> => {
    const now = new Date();
    const row: EntityRow = {
      userId: input.userId,
      documentId: input.documentId,
      epubChapterOrder: input.epubChapterOrder,
      updatedAt: now,
    };
    await Instance.db
      .insert(progress)
      .values(row)
      .onConflictDoUpdate({
        target: [progress.userId, progress.documentId],
        set: {
          epubChapterOrder: row.epubChapterOrder,
          updatedAt: row.updatedAt,
        },
      });
    return toEntity(row);
  };
}
