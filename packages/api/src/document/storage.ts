import { and, desc, eq } from "drizzle-orm";
import { document, progress } from "../db/schema";
import { Instance } from "../instance";
import type { Document } from "./document";

// D1-backed `document` store. Books are scoped by userId at every read/write
// — a row whose user_id doesn't match the caller is treated identically to a
// missing row, so callers don't need to distinguish "not yours" from "not
// found".
export namespace DocumentStorage {
  export const entitySelect = {
    id: document.id,
    userId: document.userId,
    kind: document.kind,
    mimeType: document.mimeType,
    originalFilename: document.originalFilename,
    sizeBytes: document.sizeBytes,
    sha256: document.sha256,
    title: document.title,
    sensitive: document.sensitive,
    status: document.status,
    errorReason: document.errorReason,
    r2KeyOriginal: document.r2KeyOriginal,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  } as const;

  export type EntityRow = {
    id: string;
    userId: string;
    kind: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    sha256: string;
    title: string;
    sensitive: boolean;
    status: string;
    errorReason: string | null;
    r2KeyOriginal: string;
    createdAt: Date;
    updatedAt: Date;
  };

  type EntityWithKey = Document.Entity & { userId: string; r2KeyOriginal: string };

  // Optional embedded progress, joined in by list/get and discarded by the
  // workflow's getInternal path. Defaults to null, which is also the
  // truthful state for a freshly-created (unread) row.
  export const toEntity = (
    row: EntityRow,
    progress: Document.Progress | null = null,
  ): EntityWithKey => ({
    id: row.id,
    userId: row.userId,
    kind: parseKind(row.kind),
    mimeType: row.mimeType,
    originalFilename: row.originalFilename,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    title: row.title,
    sensitive: row.sensitive,
    status: parseStatus(row.status),
    errorReason: row.errorReason,
    progress,
    r2KeyOriginal: row.r2KeyOriginal,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  const parseKind = (raw: string): Document.Kind => {
    if (raw === "epub" || raw === "pdf" || raw === "image" || raw === "text") return raw;
    return "other";
  };

  const parseStatus = (raw: string): Document.Status => {
    if (raw === "uploading" || raw === "processing" || raw === "processed" || raw === "failed") {
      return raw;
    }
    return "failed";
  };

  export type CreateInput = {
    id: string;
    userId: string;
    kind: Document.Kind;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    sha256: string;
    title: string;
    sensitive: boolean;
    status: Document.Status;
    r2KeyOriginal: string;
  };

  export const create = async (input: CreateInput): Promise<Document.Entity> => {
    const now = new Date();
    const row: EntityRow = {
      id: input.id,
      userId: input.userId,
      kind: input.kind,
      mimeType: input.mimeType,
      originalFilename: input.originalFilename,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      title: input.title,
      sensitive: input.sensitive,
      status: input.status,
      errorReason: null,
      r2KeyOriginal: input.r2KeyOriginal,
      createdAt: now,
      updatedAt: now,
    };
    await Instance.db.insert(document).values(row);
    return projectEntity(toEntity(row));
  };

  // Joined select shape used by user-scoped list/get. The progress columns
  // are nullable for documents the caller hasn't opened yet.
  const entitySelectWithProgress = {
    ...entitySelect,
    progressEpubChapterOrder: progress.epubChapterOrder,
    progressPdfPageNumber: progress.pdfPageNumber,
    progressUpdatedAt: progress.updatedAt,
  } as const;

  type ProgressRow = {
    progressEpubChapterOrder: number | null;
    progressPdfPageNumber: number | null;
    progressUpdatedAt: Date | null;
  };

  const projectProgress = (row: ProgressRow): Document.Progress | null =>
    row.progressUpdatedAt
      ? {
          epubChapterOrder: row.progressEpubChapterOrder,
          pdfPageNumber: row.progressPdfPageNumber,
          updatedAt: row.progressUpdatedAt.toISOString(),
        }
      : null;

  export const get = async (
    id: string,
    userId: string,
  ): Promise<(Document.Entity & { r2KeyOriginal: string }) | null> => {
    const rows = await Instance.db
      .select(entitySelectWithProgress)
      .from(document)
      .leftJoin(progress, and(eq(progress.documentId, document.id), eq(progress.userId, userId)))
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const entity = toEntity(row, projectProgress(row));
    return { ...projectEntity(entity), r2KeyOriginal: entity.r2KeyOriginal };
  };

  export const list = async (userId: string): Promise<Document.Entity[]> => {
    const rows = await Instance.db
      .select(entitySelectWithProgress)
      .from(document)
      .leftJoin(progress, and(eq(progress.documentId, document.id), eq(progress.userId, userId)))
      .where(eq(document.userId, userId))
      .orderBy(desc(document.createdAt));
    return rows.map((r) => projectEntity(toEntity(r, projectProgress(r))));
  };

  export const remove = async (id: string, userId: string): Promise<boolean> => {
    const rows = await Instance.db
      .delete(document)
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .returning({ id: document.id });
    return rows.length > 0;
  };

  export const updateTitleAndStatus = async (
    id: string,
    title: string,
    status: Document.Status,
  ): Promise<void> => {
    await Instance.db
      .update(document)
      .set({ title, status, updatedAt: new Date(), errorReason: null })
      .where(eq(document.id, id));
  };

  // User-facing rename. Scoped to the caller; returns null when the row is
  // missing or owned by another user (same NotFoundError semantics as get).
  export const updateTitle = async (
    id: string,
    userId: string,
    title: string,
  ): Promise<Document.Entity | null> => {
    const rows = await Instance.db
      .update(document)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .returning(entitySelect);
    const row = rows[0];
    if (!row) return null;
    return projectEntity(toEntity(row));
  };

  export const markProcessed = async (id: string, title: string | null): Promise<void> => {
    const set: Record<string, unknown> = {
      status: "processed",
      errorReason: null,
      updatedAt: new Date(),
    };
    if (title) set["title"] = title;
    await Instance.db.update(document).set(set).where(eq(document.id, id));
  };

  export const markFailed = async (id: string, reason: string): Promise<void> => {
    await Instance.db
      .update(document)
      .set({ status: "failed", errorReason: reason, updatedAt: new Date() })
      .where(eq(document.id, id));
  };

  // The owning Worker (the workflow) needs access to a row by id without a
  // userId scope so it can persist parsed data. Tests of the workflow path
  // exercise this directly.
  export const getInternal = async (
    id: string,
  ): Promise<(EntityRow & { kindParsed: Document.Kind }) | null> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(document)
      .where(eq(document.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { ...row, kindParsed: parseKind(row.kind) };
  };

  // Strip internal-only fields (`userId`, `r2KeyOriginal`) before exposing to
  // routes / SDK. The route layer uses `Document.Entity` as the wire type.
  const projectEntity = (entity: EntityWithKey): Document.Entity => ({
    id: entity.id,
    kind: entity.kind,
    mimeType: entity.mimeType,
    originalFilename: entity.originalFilename,
    sizeBytes: entity.sizeBytes,
    sha256: entity.sha256,
    title: entity.title,
    sensitive: entity.sensitive,
    status: entity.status,
    errorReason: entity.errorReason,
    progress: entity.progress,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
