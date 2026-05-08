import { Binder } from "../binder/binder";
import type { HighlightRow } from "../binder/binder-store";
import type { Highlight } from "./highlight";

// BinderDO-backed `highlight` store. UserId scopes to the BinderDO instance
// (`Binder.require(userId)`); a row owned by another user lives in another
// DO entirely and is unreachable, which matches the previous "treat foreign
// rows like missing rows" semantics.
export namespace HighlightStorage {
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

  // BinderDO's RPC type for position is a generic JSON object; narrow it
  // to the highlight-specific shape. Falls back to a zero-length anchor on
  // unexpected payloads — defensive only; we always write the right shape.
  const toPosition = (raw: HighlightRow["position"]): Highlight.Position => {
    const start = raw["offsetStart"];
    const end = raw["offsetEnd"];
    if (typeof start === "number" && typeof end === "number") {
      return { offsetStart: start, offsetEnd: end };
    }
    return { offsetStart: 0, offsetEnd: 0 };
  };

  const toEntity = (row: HighlightRow): Highlight.Entity => ({
    id: row.highlightId,
    documentId: row.documentId,
    sectionKey: row.sectionKey,
    position: toPosition(row.position),
    textSnippet: row.textSnippet,
    color: parseColor(row.color),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  });

  export type CreateInput = {
    id: string;
    userId: string;
    documentId: string;
    sectionKey: string;
    position: Highlight.Position;
    textSnippet: string;
    color: Highlight.Color;
  };

  export const create = async (input: CreateInput): Promise<Highlight.Entity> => {
    const binder = Binder.require(input.userId);
    const row = await binder.createHighlight({
      highlightId: input.id,
      documentId: input.documentId,
      sectionKey: input.sectionKey,
      position: input.position,
      textSnippet: input.textSnippet,
      color: input.color,
    });
    return toEntity(row);
  };

  export type ListQuery = {
    documentId: string;
    sectionKey?: string;
  };

  export const list = async (userId: string, query: ListQuery): Promise<Highlight.Entity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.listHighlights({
      documentId: query.documentId,
      sectionKey: query.sectionKey,
    });
    return rows.map(toEntity);
  };

  // Corpus-wide list. Optional documentId filter, optional limit. Caller
  // is expected to enforce a sane limit; the DO defaults to 50.
  export type ListAllQuery = {
    documentId?: string;
    limit?: number;
  };

  export const listAll = async (
    userId: string,
    query: ListAllQuery,
  ): Promise<Highlight.Entity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.listHighlightsAll({
      documentId: query.documentId,
      limit: query.limit,
    });
    return rows.map(toEntity);
  };

  export const get = async (id: string, userId: string): Promise<Highlight.Entity | null> => {
    const binder = Binder.require(userId);
    const row = await binder.getHighlight(id);
    return row ? toEntity(row) : null;
  };

  export type UpdatePatch = {
    color?: Highlight.Color;
  };

  export const update = async (
    id: string,
    userId: string,
    patch: UpdatePatch,
  ): Promise<Highlight.Entity | null> => {
    const binder = Binder.require(userId);
    const row = await binder.updateHighlight({ highlightId: id, color: patch.color });
    return row ? toEntity(row) : null;
  };

  export const remove = async (id: string, userId: string): Promise<boolean> => {
    const binder = Binder.require(userId);
    return binder.removeHighlight(id);
  };
}
