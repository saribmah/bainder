import { progress } from "../db/schema";
import { Instance } from "../instance";
import type { Progress } from "./progress";

// D1-backed `progress` store. Keyed by composite (userId, documentId);
// upsert overwrites in place via ON CONFLICT.
export namespace ProgressStorage {
  export type EntityRow = {
    userId: string;
    documentId: string;
    sectionKey: string;
    position: Progress.Position | null;
    progressPercent: number | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export const toEntity = (row: EntityRow): Progress.Entity => ({
    documentId: row.documentId,
    sectionKey: row.sectionKey,
    position: row.position,
    progressPercent: row.progressPercent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  export type UpsertInput = {
    userId: string;
    documentId: string;
    sectionKey: string;
    position: Progress.Position | null;
    progressPercent: number | null;
  };

  export const upsert = async (input: UpsertInput): Promise<Progress.Entity> => {
    const now = new Date();
    const row: EntityRow = {
      userId: input.userId,
      documentId: input.documentId,
      sectionKey: input.sectionKey,
      position: input.position,
      progressPercent: input.progressPercent,
      createdAt: now,
      updatedAt: now,
    };
    await Instance.db
      .insert(progress)
      .values(row)
      .onConflictDoUpdate({
        target: [progress.userId, progress.documentId],
        set: {
          sectionKey: row.sectionKey,
          position: row.position,
          progressPercent: row.progressPercent,
          // createdAt is preserved on conflict — it tracks first-open.
          updatedAt: row.updatedAt,
        },
      });
    return toEntity(row);
  };
}
