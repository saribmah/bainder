import { Binder } from "../binder/binder";
import type { ProgressRow } from "../binder/binder-store";
import type { Progress } from "./progress";

// BinderDO-backed `progress` store. Userid scopes to the BinderDO instance
// (`Binder.require(userId)`); rows are keyed only by documentId inside the DO.
export namespace ProgressStorage {
  // BinderDO's RPC type for position is a generic JSON object; we narrow
  // to the format-specific shape here.
  const toPosition = (raw: ProgressRow["position"]): Progress.Position | null => {
    if (raw === null) return null;
    const offset = raw["offset"];
    return typeof offset === "number" ? { offset } : {};
  };

  const toEntity = (row: ProgressRow): Progress.Entity => ({
    documentId: row.documentId,
    sectionKey: row.sectionKey,
    position: toPosition(row.position),
    progressPercent: row.progressPercent,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  });

  export type UpsertInput = {
    userId: string;
    documentId: string;
    sectionKey: string;
    position: Progress.Position | null;
    progressPercent: number | null;
  };

  export const upsert = async (input: UpsertInput): Promise<Progress.Entity> => {
    const binder = Binder.require(input.userId);
    const row = await binder.upsertProgress({
      documentId: input.documentId,
      sectionKey: input.sectionKey,
      position: input.position,
      progressPercent: input.progressPercent,
    });
    return toEntity(row);
  };
}
