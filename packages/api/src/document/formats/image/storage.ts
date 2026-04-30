import { and, eq } from "drizzle-orm";
import { document, imageDocument } from "../../../db/schema";
import { Instance } from "../../../instance";
import { Image } from "./image";

export namespace ImageStorage {
  export const entitySelect = {
    documentId: imageDocument.documentId,
    width: imageDocument.width,
    height: imageDocument.height,
    format: imageDocument.format,
  } as const;

  export type EntityRow = {
    documentId: string;
    width: number;
    height: number;
    format: string;
  };

  export const toEntity = (row: EntityRow): Image.Entity => ({
    documentId: row.documentId,
    width: row.width,
    height: row.height,
    format: parseFormat(row.format),
  });

  const parseFormat = (raw: string): Image.Format => {
    const result = Image.Format.safeParse(raw);
    return result.success ? result.data : "unknown";
  };

  export type CreateInput = {
    documentId: string;
    width: number;
    height: number;
    format: Image.Format;
  };

  export const create = async (input: CreateInput): Promise<Image.Entity> => {
    const row = {
      documentId: input.documentId,
      width: input.width,
      height: input.height,
      format: input.format,
    };
    await Instance.db.insert(imageDocument).values(row);
    return toEntity(row);
  };

  export const get = async (documentId: string, userId: string): Promise<Image.Entity | null> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(imageDocument)
      .innerJoin(document, eq(document.id, imageDocument.documentId))
      .where(and(eq(imageDocument.documentId, documentId), eq(document.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  };
}
