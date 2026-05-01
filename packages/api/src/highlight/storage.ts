import { and, asc, eq } from "drizzle-orm";
import { highlight } from "../db/schema";
import { Instance } from "../instance";
import type { Highlight } from "./highlight";

// D1-backed `highlight` store. All reads/writes are scoped by userId; a row
// owned by another user is treated identically to a missing row.
export namespace HighlightStorage {
  export const entitySelect = {
    id: highlight.id,
    documentId: highlight.documentId,
    epubChapterOrder: highlight.epubChapterOrder,
    offsetStart: highlight.offsetStart,
    offsetEnd: highlight.offsetEnd,
    textSnippet: highlight.textSnippet,
    color: highlight.color,
    note: highlight.note,
    createdAt: highlight.createdAt,
    updatedAt: highlight.updatedAt,
  } as const;

  export type EntityRow = {
    id: string;
    documentId: string;
    epubChapterOrder: number;
    offsetStart: number;
    offsetEnd: number;
    textSnippet: string;
    color: string;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export const toEntity = (row: EntityRow): Highlight.Entity => ({
    id: row.id,
    documentId: row.documentId,
    epubChapterOrder: row.epubChapterOrder,
    offsetStart: row.offsetStart,
    offsetEnd: row.offsetEnd,
    textSnippet: row.textSnippet,
    color: parseColor(row.color),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  const parseColor = (raw: string): Highlight.Color => {
    if (
      raw === "pink" ||
      raw === "yellow" ||
      raw === "green" ||
      raw === "blue" ||
      raw === "purple"
    ) {
      return raw;
    }
    return "yellow";
  };

  export type CreateInput = {
    id: string;
    userId: string;
    documentId: string;
    epubChapterOrder: number;
    offsetStart: number;
    offsetEnd: number;
    textSnippet: string;
    color: Highlight.Color;
    note: string | null;
  };

  export const create = async (input: CreateInput): Promise<Highlight.Entity> => {
    const now = new Date();
    const row: EntityRow & { userId: string } = {
      id: input.id,
      userId: input.userId,
      documentId: input.documentId,
      epubChapterOrder: input.epubChapterOrder,
      offsetStart: input.offsetStart,
      offsetEnd: input.offsetEnd,
      textSnippet: input.textSnippet,
      color: input.color,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    };
    await Instance.db.insert(highlight).values(row);
    return toEntity(row);
  };

  export type ListQuery = {
    documentId: string;
    epubChapterOrder?: number;
  };

  export const list = async (userId: string, query: ListQuery): Promise<Highlight.Entity[]> => {
    const conds = [eq(highlight.userId, userId), eq(highlight.documentId, query.documentId)];
    if (query.epubChapterOrder !== undefined) {
      conds.push(eq(highlight.epubChapterOrder, query.epubChapterOrder));
    }
    const rows = await Instance.db
      .select(entitySelect)
      .from(highlight)
      .where(and(...conds))
      .orderBy(asc(highlight.createdAt));
    return rows.map(toEntity);
  };

  export type UpdatePatch = {
    color?: Highlight.Color;
    // undefined: leave alone. null: clear. string: set.
    note?: string | null;
  };

  export const update = async (
    id: string,
    userId: string,
    patch: UpdatePatch,
  ): Promise<Highlight.Entity | null> => {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.color !== undefined) set["color"] = patch.color;
    if (patch.note !== undefined) set["note"] = patch.note;
    const rows = await Instance.db
      .update(highlight)
      .set(set)
      .where(and(eq(highlight.id, id), eq(highlight.userId, userId)))
      .returning(entitySelect);
    const row = rows[0];
    return row ? toEntity(row) : null;
  };

  export const remove = async (id: string, userId: string): Promise<boolean> => {
    const rows = await Instance.db
      .delete(highlight)
      .where(and(eq(highlight.id, id), eq(highlight.userId, userId)))
      .returning({ id: highlight.id });
    return rows.length > 0;
  };
}
