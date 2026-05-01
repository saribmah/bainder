import { and, eq } from "drizzle-orm";
import { document, textDocument } from "../../../db/schema";
import { Instance } from "../../../instance";
import { Text } from "./text";

export namespace TextStorage {
  export const entitySelect = {
    documentId: textDocument.documentId,
    charset: textDocument.charset,
    text: textDocument.text,
  } as const;

  export type EntityRow = {
    documentId: string;
    charset: string;
    text: string;
  };

  export const toEntity = (row: EntityRow): Text.Entity => ({
    documentId: row.documentId,
    charset: row.charset,
    text: row.text,
  });

  export type CreateInput = {
    documentId: string;
    charset: string;
    text: string;
  };

  export const create = async (input: CreateInput): Promise<Text.Entity> => {
    // Idempotent for Workflow retries.
    await Instance.db.delete(textDocument).where(eq(textDocument.documentId, input.documentId));
    await Instance.db.insert(textDocument).values(input);
    return toEntity(input);
  };

  export const get = async (documentId: string, userId: string): Promise<Text.Entity | null> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(textDocument)
      .innerJoin(document, eq(document.id, textDocument.documentId))
      .where(and(eq(textDocument.documentId, documentId), eq(document.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  };
}
