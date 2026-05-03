import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { document, progress, shelf, shelfDocument } from "../db/schema";
import type { Document } from "../document/document";
import { Instance } from "../instance";
import type { Shelf } from "./shelf";

// D1-backed shelf store. All reads/writes are scoped by userId; a row owned
// by another user is treated identically to a missing row, matching the
// document/highlight convention.
//
// Smart shelves are not stored — `smartCounts` and `smartDocuments` derive
// them from the `progress` table. Storage exposes the raw queries; the
// feature module wraps them.
//
// Document rows surfaced from this module are projected inline (we don't
// import DocumentStorage — peer-storage imports are forbidden by AGENTS.md).
// The mapping mirrors DocumentStorage.toEntity; if Document.Entity grows a
// field, both sites need the addition.
export namespace ShelfStorage {
  // ---- Custom shelf entity ----------------------------------------------
  export const entitySelect = {
    id: shelf.id,
    userId: shelf.userId,
    name: shelf.name,
    description: shelf.description,
    position: shelf.position,
    createdAt: shelf.createdAt,
    updatedAt: shelf.updatedAt,
  } as const;

  export type EntityRow = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    position: number | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export const toEntity = (row: EntityRow, itemCount: number): Shelf.CustomEntity => ({
    kind: "custom",
    id: row.id,
    name: row.name,
    description: row.description,
    itemCount,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  // ---- Custom shelf reads -----------------------------------------------
  // Sort: position ASC NULLS LAST, then createdAt ASC. SQLite's NULL sorts
  // first by default; the leading `(position IS NULL)` term flips that so
  // explicitly-positioned shelves come before unsorted ones.
  const shelfOrder = [
    sql`(${shelf.position} IS NULL)`,
    asc(shelf.position),
    asc(shelf.createdAt),
  ] as const;

  export const list = async (userId: string): Promise<Shelf.CustomEntity[]> => {
    const rows = await Instance.db
      .select({
        ...entitySelect,
        itemCount: sql<number>`count(${shelfDocument.documentId})`.as("item_count"),
      })
      .from(shelf)
      .leftJoin(shelfDocument, eq(shelfDocument.shelfId, shelf.id))
      .where(eq(shelf.userId, userId))
      .groupBy(shelf.id)
      .orderBy(...shelfOrder);

    return rows.map((r) => toEntity(r, Number(r.itemCount ?? 0)));
  };

  export const get = async (userId: string, id: string): Promise<Shelf.CustomEntity | null> => {
    const rows = await Instance.db
      .select({
        ...entitySelect,
        itemCount: sql<number>`count(${shelfDocument.documentId})`.as("item_count"),
      })
      .from(shelf)
      .leftJoin(shelfDocument, eq(shelfDocument.shelfId, shelf.id))
      .where(and(eq(shelf.id, id), eq(shelf.userId, userId)))
      .groupBy(shelf.id)
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return toEntity(row, Number(row.itemCount ?? 0));
  };

  // Lighter ownership check used before mutations — avoids the GROUP BY +
  // count round-trip that `get` does.
  export const exists = async (userId: string, id: string): Promise<boolean> => {
    const rows = await Instance.db
      .select({ id: shelf.id })
      .from(shelf)
      .where(and(eq(shelf.id, id), eq(shelf.userId, userId)))
      .limit(1);
    return rows.length > 0;
  };

  export const findByLowerName = async (
    userId: string,
    nameLower: string,
  ): Promise<{ id: string } | null> => {
    const rows = await Instance.db
      .select({ id: shelf.id })
      .from(shelf)
      .where(and(eq(shelf.userId, userId), sql`lower(${shelf.name}) = ${nameLower}`))
      .limit(1);
    return rows[0] ?? null;
  };

  // ---- Custom shelf writes ----------------------------------------------
  export type CreateInput = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
  };

  export const create = async (input: CreateInput): Promise<Shelf.CustomEntity> => {
    const now = new Date();
    const row: EntityRow = {
      id: input.id,
      userId: input.userId,
      name: input.name,
      description: input.description,
      position: null,
      createdAt: now,
      updatedAt: now,
    };
    await Instance.db.insert(shelf).values(row);
    return toEntity(row, 0);
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
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) set["name"] = patch.name;
    if (patch.description !== undefined) set["description"] = patch.description;
    if (patch.position !== undefined) set["position"] = patch.position;

    const rows = await Instance.db
      .update(shelf)
      .set(set)
      .where(and(eq(shelf.id, id), eq(shelf.userId, userId)))
      .returning({ id: shelf.id });
    if (rows.length === 0) return null;

    // Refetch through `get` so the response carries the up-to-date
    // itemCount alongside the patched fields.
    return get(userId, id);
  };

  export const remove = async (userId: string, id: string): Promise<boolean> => {
    const rows = await Instance.db
      .delete(shelf)
      .where(and(eq(shelf.id, id), eq(shelf.userId, userId)))
      .returning({ id: shelf.id });
    return rows.length > 0;
  };

  // ---- Membership writes ------------------------------------------------
  export type AddMembershipInput = {
    shelfId: string;
    documentId: string;
    userId: string;
  };

  export const addDocument = async (input: AddMembershipInput): Promise<void> => {
    // Idempotent: PUT /shelves/:id/documents/:docId is "ensure on shelf".
    // ON CONFLICT DO NOTHING preserves the original addedAt and position
    // so a re-add doesn't jump the doc to the bottom of the list.
    await Instance.db
      .insert(shelfDocument)
      .values({
        shelfId: input.shelfId,
        documentId: input.documentId,
        userId: input.userId,
        position: null,
        addedAt: new Date(),
      })
      .onConflictDoNothing();
  };

  export const removeDocument = async (
    userId: string,
    shelfId: string,
    documentId: string,
  ): Promise<boolean> => {
    const rows = await Instance.db
      .delete(shelfDocument)
      .where(
        and(
          eq(shelfDocument.shelfId, shelfId),
          eq(shelfDocument.documentId, documentId),
          eq(shelfDocument.userId, userId),
        ),
      )
      .returning({ documentId: shelfDocument.documentId });
    return rows.length > 0;
  };

  export const updateMembershipPosition = async (
    userId: string,
    shelfId: string,
    documentId: string,
    position: number | null,
  ): Promise<boolean> => {
    const rows = await Instance.db
      .update(shelfDocument)
      .set({ position })
      .where(
        and(
          eq(shelfDocument.shelfId, shelfId),
          eq(shelfDocument.documentId, documentId),
          eq(shelfDocument.userId, userId),
        ),
      )
      .returning({ documentId: shelfDocument.documentId });
    return rows.length > 0;
  };

  // ---- Document projection ----------------------------------------------
  // Inline projection — we deliberately don't import DocumentStorage.
  const documentSelect = {
    id: document.id,
    kind: document.kind,
    mimeType: document.mimeType,
    originalFilename: document.originalFilename,
    sizeBytes: document.sizeBytes,
    sha256: document.sha256,
    title: document.title,
    sensitive: document.sensitive,
    status: document.status,
    errorReason: document.errorReason,
    coverImage: document.coverImage,
    sourceUrl: document.sourceUrl,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    progressSectionKey: progress.sectionKey,
    progressPercent: progress.progressPercent,
    progressUpdatedAt: progress.updatedAt,
  } as const;

  type DocumentRow = {
    id: string;
    kind: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    sha256: string;
    title: string;
    sensitive: boolean;
    status: string;
    errorReason: string | null;
    coverImage: string | null;
    sourceUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    progressSectionKey: string | null;
    progressPercent: number | null;
    progressUpdatedAt: Date | null;
  };

  const toDocumentEntity = (row: DocumentRow): Document.Entity => ({
    id: row.id,
    kind: parseDocumentKind(row.kind),
    mimeType: row.mimeType,
    originalFilename: row.originalFilename,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    title: row.title,
    sensitive: row.sensitive,
    status: parseDocumentStatus(row.status),
    errorReason: row.errorReason,
    coverImage: row.coverImage,
    sourceUrl: row.sourceUrl,
    progress:
      row.progressUpdatedAt && row.progressSectionKey
        ? {
            sectionKey: row.progressSectionKey,
            progressPercent: row.progressPercent,
            updatedAt: row.progressUpdatedAt.toISOString(),
          }
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

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

  // ---- Custom shelf documents -------------------------------------------
  // Sort: position ASC NULLS LAST, then addedAt ASC.
  export const documents = async (userId: string, shelfId: string): Promise<Document.Entity[]> => {
    const rows = await Instance.db
      .select(documentSelect)
      .from(shelfDocument)
      .innerJoin(document, eq(document.id, shelfDocument.documentId))
      .leftJoin(progress, and(eq(progress.documentId, document.id), eq(progress.userId, userId)))
      .where(and(eq(shelfDocument.shelfId, shelfId), eq(shelfDocument.userId, userId)))
      .orderBy(
        sql`(${shelfDocument.position} IS NULL)`,
        asc(shelfDocument.position),
        asc(shelfDocument.addedAt),
      );

    return rows.map(toDocumentEntity);
  };

  // ---- Smart shelves ----------------------------------------------------
  // "reading" = progress row exists AND (percent IS NULL OR percent < 1).
  // "finished" = percent = 1. The smart synthesis lives in the feature
  // module; storage just runs the queries.
  export const smartCounts = async (
    userId: string,
  ): Promise<{ reading: number; finished: number }> => {
    const rows = await Instance.db
      .select({
        reading:
          sql<number>`sum(case when ${progress.progressPercent} is null or ${progress.progressPercent} < 1 then 1 else 0 end)`.as(
            "reading_count",
          ),
        finished: sql<number>`sum(case when ${progress.progressPercent} = 1 then 1 else 0 end)`.as(
          "finished_count",
        ),
      })
      .from(progress)
      .where(eq(progress.userId, userId));

    const row = rows[0];
    return {
      reading: Number(row?.reading ?? 0),
      finished: Number(row?.finished ?? 0),
    };
  };

  // Sort: progress.updatedAt DESC — most-recently-touched first.
  export const smartDocuments = async (
    userId: string,
    smartType: Shelf.SmartType,
  ): Promise<Document.Entity[]> => {
    const condition =
      smartType === "finished"
        ? eq(progress.progressPercent, 1)
        : or(isNull(progress.progressPercent), lt(progress.progressPercent, 1));

    const rows = await Instance.db
      .select(documentSelect)
      .from(progress)
      .innerJoin(document, eq(document.id, progress.documentId))
      .where(and(eq(progress.userId, userId), condition))
      .orderBy(desc(progress.updatedAt));

    return rows.map(toDocumentEntity);
  };

  // ---- Reverse lookup ---------------------------------------------------
  // Two-step read: (1) shelf ids the document is on, (2) shelf rows + counts.
  // Cheaper to reason about than a single query with a correlated subquery,
  // and the reverse-lookup result set is tiny in practice.
  export const shelvesForDocument = async (
    userId: string,
    documentId: string,
  ): Promise<Shelf.CustomEntity[]> => {
    const memberships = await Instance.db
      .select({ shelfId: shelfDocument.shelfId })
      .from(shelfDocument)
      .where(and(eq(shelfDocument.documentId, documentId), eq(shelfDocument.userId, userId)));

    if (memberships.length === 0) return [];

    const ids = memberships.map((m) => m.shelfId);
    const rows = await Instance.db
      .select({
        ...entitySelect,
        itemCount: sql<number>`count(${shelfDocument.documentId})`.as("item_count"),
      })
      .from(shelf)
      .leftJoin(shelfDocument, eq(shelfDocument.shelfId, shelf.id))
      .where(and(eq(shelf.userId, userId), inArray(shelf.id, ids)))
      .groupBy(shelf.id)
      .orderBy(...shelfOrder);

    return rows.map((r) => toEntity(r, Number(r.itemCount ?? 0)));
  };
}
