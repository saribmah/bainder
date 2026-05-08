import { Binder } from "../binder/binder";
import type { NoteRow } from "../binder/binder-store";
import type { Note } from "./note";

// BinderDO-backed `note` store. UserId scopes to the BinderDO instance
// (`Binder.require(userId)`); a row owned by another user lives in another
// DO entirely and is unreachable.
export namespace NoteStorage {
  const toEntity = (row: NoteRow): Note.Entity => ({
    id: row.noteId,
    documentId: row.documentId,
    sectionKey: row.sectionKey,
    highlightId: row.highlightId,
    body: row.body,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  });

  export type CreateInput = {
    id: string;
    userId: string;
    documentId: string;
    sectionKey: string | null;
    highlightId: string | null;
    body: string;
  };

  export const create = async (input: CreateInput): Promise<Note.Entity> => {
    const binder = Binder.require(input.userId);
    const row = await binder.createNote({
      noteId: input.id,
      documentId: input.documentId,
      sectionKey: input.sectionKey,
      highlightId: input.highlightId,
      body: input.body,
    });
    return toEntity(row);
  };

  export type ListQuery = {
    documentId: string;
    sectionKey?: string;
    highlightId?: string;
    unanchored?: boolean;
  };

  export const list = async (userId: string, query: ListQuery): Promise<Note.Entity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.listNotes({
      documentId: query.documentId,
      sectionKey: query.sectionKey,
      highlightId: query.highlightId,
      unanchored: query.unanchored,
    });
    return rows.map(toEntity);
  };

  // Corpus-wide list. Optional documentId filter, optional limit. Caller
  // is expected to enforce a sane limit; the DO defaults to 50.
  export type ListAllQuery = {
    documentId?: string;
    limit?: number;
  };

  export const listAll = async (userId: string, query: ListAllQuery): Promise<Note.Entity[]> => {
    const binder = Binder.require(userId);
    const rows = await binder.listNotesAll({
      documentId: query.documentId,
      limit: query.limit,
    });
    return rows.map(toEntity);
  };

  export const get = async (id: string, userId: string): Promise<Note.Entity | null> => {
    const binder = Binder.require(userId);
    const row = await binder.getNote(id);
    return row ? toEntity(row) : null;
  };

  export type UpdatePatch = {
    body?: string;
  };

  export const update = async (
    id: string,
    userId: string,
    patch: UpdatePatch,
  ): Promise<Note.Entity | null> => {
    const binder = Binder.require(userId);
    const row = await binder.updateNote({ noteId: id, body: patch.body });
    return row ? toEntity(row) : null;
  };

  export const remove = async (id: string, userId: string): Promise<boolean> => {
    const binder = Binder.require(userId);
    return binder.removeNote(id);
  };
}
