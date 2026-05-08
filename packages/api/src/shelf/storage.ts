import { Binder } from "../binder/binder";
import type { DocumentWithProgressRow, ShelfRowWithCount } from "../binder/binder-store";
import type { Document } from "../document/document";
import type { Shelf } from "./shelf";

// BinderDO-backed shelf store. UserId scopes to the BinderDO instance
// (`Binder.require(userId)`); a row owned by another user lives in another
// DO entirely and is unreachable. Custom shelves, smart-shelf synthesis,
// membership writes, and reverse lookups all run inside the same DO.
//
// Smart shelves are not stored — `smartCounts` and `smartDocuments` derive
// them from the per-binder `progress` table. The feature module wraps them.
//
// Document rows surfaced from this module are projected inline; the mapping
// mirrors DocumentStorage's projection (peer-storage imports are forbidden by
// AGENTS.md).
export namespace ShelfStorage {
  // ---- Custom shelf entity mapping ---------------------------------------
  const toCustomEntity = (row: ShelfRowWithCount): Shelf.CustomEntity => ({
    kind: "custom",
    id: row.shelfId,
    name: row.name,
    description: row.description,
    itemCount: row.itemCount,
    position: row.position,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  });

  // ---- Custom shelf reads ------------------------------------------------
  export const list = async (userId: string): Promise<Shelf.CustomEntity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.listShelves();
    return rows.map(toCustomEntity);
  };

  export const get = async (userId: string, id: string): Promise<Shelf.CustomEntity | null> => {
    const binder = Binder.require(userId);
    const row = await binder.getShelf(id);
    return row ? toCustomEntity(row) : null;
  };

  export const exists = async (userId: string, id: string): Promise<boolean> => {
    const binder = Binder.require(userId);
    return binder.shelfExists(id);
  };

  export const findByLowerName = async (
    userId: string,
    nameLower: string,
  ): Promise<{ id: string } | null> => {
    const binder = Binder.require(userId);
    const row = await binder.findShelfByLowerName(nameLower);
    return row ? { id: row.shelfId } : null;
  };

  // ---- Custom shelf writes -----------------------------------------------
  export type CreateInput = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
  };

  export const create = async (input: CreateInput): Promise<Shelf.CustomEntity> => {
    const binder = Binder.require(input.userId);
    const row = await binder.createShelf({
      shelfId: input.id,
      name: input.name,
      description: input.description,
    });
    return toCustomEntity(row);
  };

  export type UpdatePatch = {
    name?: string;
    // undefined leaves alone, null clears, string sets — same convention
    // as Highlight.update.
    description?: string | null;
    position?: number | null;
  };

  export const update = async (
    userId: string,
    id: string,
    patch: UpdatePatch,
  ): Promise<Shelf.CustomEntity | null> => {
    const binder = Binder.require(userId);
    const row = await binder.updateShelf({
      shelfId: id,
      name: patch.name,
      description: patch.description,
      position: patch.position,
    });
    return row ? toCustomEntity(row) : null;
  };

  export const remove = async (userId: string, id: string): Promise<boolean> => {
    const binder = Binder.require(userId);
    return binder.removeShelf(id);
  };

  // ---- Membership writes -------------------------------------------------
  export type AddMembershipInput = {
    shelfId: string;
    documentId: string;
    userId: string;
  };

  export const addDocument = async (input: AddMembershipInput): Promise<void> => {
    const binder = Binder.require(input.userId);
    await binder.addShelfDocument({ shelfId: input.shelfId, documentId: input.documentId });
  };

  export const removeDocument = async (
    userId: string,
    shelfId: string,
    documentId: string,
  ): Promise<boolean> => {
    const binder = Binder.require(userId);
    return binder.removeShelfDocument({ shelfId, documentId });
  };

  export const updateMembershipPosition = async (
    userId: string,
    shelfId: string,
    documentId: string,
    position: number | null,
  ): Promise<boolean> => {
    const binder = Binder.require(userId);
    return binder.updateShelfMembershipPosition({ shelfId, documentId, position });
  };

  // ---- Document projection -----------------------------------------------
  // Inline projection — we deliberately don't import DocumentStorage. Mirror
  // DocumentStorage's mapper; if Document.Entity grows a field, both sites
  // need the addition.
  const parseDocumentKind = (raw: string): Document.Entity["kind"] => {
    if (raw === "epub") return raw;
    throw new Error(`Unexpected document.kind value: ${raw}`);
  };

  const parseDocumentStatus = (raw: string): Document.Entity["status"] => {
    if (raw === "uploading" || raw === "processing" || raw === "processed" || raw === "failed") {
      return raw;
    }
    return "failed";
  };

  const toDocumentEntity = (row: DocumentWithProgressRow): Document.Entity => ({
    id: row.documentId,
    kind: parseDocumentKind(row.kind),
    mimeType: row.mimeType,
    originalFilename: row.originalFilename,
    sizeBytes: row.sizeBytes,
    sha256: row.contentHash,
    title: row.title,
    sensitive: row.sensitive,
    status: parseDocumentStatus(row.status),
    errorReason: row.errorReason,
    coverImage: row.coverImage,
    sourceUrl: row.sourceUrl,
    progress: row.progress
      ? {
          sectionKey: row.progress.sectionKey,
          progressPercent: row.progress.progressPercent,
          updatedAt: new Date(row.progress.updatedAt).toISOString(),
        }
      : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  });

  // ---- Custom shelf documents --------------------------------------------
  export const documents = async (userId: string, shelfId: string): Promise<Document.Entity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.listShelfDocuments(shelfId);
    return rows.map(toDocumentEntity);
  };

  // ---- Smart shelves -----------------------------------------------------
  // "reading" = progress row exists AND (percent IS NULL OR percent < 1).
  // "finished" = percent = 1. The smart synthesis lives in the feature
  // module; storage just runs the queries.
  export const smartCounts = async (
    userId: string,
  ): Promise<{ reading: number; finished: number }> => {
    const binder = Binder.require(userId);
    return binder.smartCounts();
  };

  export const smartDocuments = async (
    userId: string,
    smartType: Shelf.SmartType,
  ): Promise<Document.Entity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.smartDocuments(smartType);
    return rows.map(toDocumentEntity);
  };

  // ---- Reverse lookup ----------------------------------------------------
  export const shelvesForDocument = async (
    userId: string,
    documentId: string,
  ): Promise<Shelf.CustomEntity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.shelvesForDocument(documentId);
    return rows.map(toCustomEntity);
  };
}
