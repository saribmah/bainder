import { z } from "zod";
import { NamedError } from "../utils/error";
import { DocumentAssetStore } from "./asset-store";
import { Epub } from "./formats/epub/epub";
import { EpubStorage } from "./formats/epub/storage";
import { detectFormat } from "./processing/parsers/detect";
import { DocumentStorage } from "./storage";

// User-visible binder primitive. One row per uploaded file. Format-specific
// reading data (chapters) lives in sibling tables and is fetched via the
// dedicated format endpoints.
//
// EPUB is currently the only supported format. New formats are reintroduced
// one at a time via `.agents/add-format.md`.
export namespace Document {
  // ---- Errors -----------------------------------------------------------
  export const NotFoundError = NamedError.create(
    "DocumentNotFoundError",
    z.object({ id: z.string(), message: z.string().optional() }),
  );
  export type NotFoundError = InstanceType<typeof NotFoundError>;

  export const WrongKindError = NamedError.create(
    "DocumentWrongKindError",
    z.object({
      id: z.string(),
      expected: z.string(),
      actual: z.string(),
      message: z.string().optional(),
    }),
  );
  export type WrongKindError = InstanceType<typeof WrongKindError>;

  export const NotProcessedError = NamedError.create(
    "DocumentNotProcessedError",
    z.object({ id: z.string(), status: z.string(), message: z.string().optional() }),
  );
  export type NotProcessedError = InstanceType<typeof NotProcessedError>;

  export const UploadTooLargeError = NamedError.create(
    "DocumentUploadTooLargeError",
    z.object({ sizeBytes: z.number(), limitBytes: z.number(), message: z.string().optional() }),
  );
  export type UploadTooLargeError = InstanceType<typeof UploadTooLargeError>;

  export const UploadEmptyError = NamedError.create(
    "DocumentUploadEmptyError",
    z.object({ message: z.string().optional() }),
  );
  export type UploadEmptyError = InstanceType<typeof UploadEmptyError>;

  export const UnsupportedFormatError = NamedError.create(
    "DocumentUnsupportedFormatError",
    z.object({
      mimeType: z.string().optional(),
      filename: z.string().optional(),
      message: z.string().optional(),
    }),
  );
  export type UnsupportedFormatError = InstanceType<typeof UnsupportedFormatError>;

  // ---- Schemas ----------------------------------------------------------
  export const Kind = z.enum(["epub"]);
  export type Kind = z.infer<typeof Kind>;

  export const Status = z.enum(["uploading", "processing", "processed", "failed"]);
  export type Status = z.infer<typeof Status>;

  // Embedded reading-progress snapshot. Lives on Document because every
  // list/get response wants it; the upsert path lives in the Progress
  // feature. Null when the caller hasn't opened this document yet.
  export const Progress = z
    .object({
      epubChapterOrder: z.number().int().nonnegative(),
      updatedAt: z.string(),
    })
    .meta({ ref: "DocumentProgress" });
  export type Progress = z.infer<typeof Progress>;

  export const Entity = z
    .object({
      id: z.string(),
      kind: Kind,
      mimeType: z.string(),
      originalFilename: z.string(),
      sizeBytes: z.number().int().nonnegative(),
      sha256: z.string(),
      title: z.string(),
      sensitive: z.boolean(),
      status: Status,
      errorReason: z.string().nullable(),
      progress: Progress.nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .meta({ ref: "Document" });
  export type Entity = z.infer<typeof Entity>;

  export const StatusPayload = z
    .object({
      id: z.string(),
      status: Status,
      errorReason: z.string().nullable(),
    })
    .meta({ ref: "DocumentStatus" });
  export type StatusPayload = z.infer<typeof StatusPayload>;

  export const ListResponse = z.object({ items: z.array(Entity) });
  export type ListResponse = z.infer<typeof ListResponse>;

  export const UpdateInput = z.object({
    title: z.string().trim().min(1).max(200),
  });
  export type UpdateInput = z.infer<typeof UpdateInput>;

  export const ChaptersResponse = z.object({ items: z.array(Epub.ChapterSummary) });
  export type ChaptersResponse = z.infer<typeof ChaptersResponse>;

  // ---- Operations -------------------------------------------------------
  export type CreateInput = {
    userId: string;
    bytes: Uint8Array;
    filename: string;
    declaredMimeType: string | null;
    sensitive: boolean;
  };

  // Inline pipeline runner: parse + persist + mark processed. The Workflow
  // (`processing/workflow.ts`) calls into this with a documentId to do the
  // heavy work outside the request path. Tests can call `processInline`
  // directly without standing up a workflow.
  export const create = async (
    input: CreateInput,
    triggerProcessing: (documentId: string) => Promise<void>,
  ): Promise<Entity> => {
    if (input.bytes.byteLength === 0) {
      throw new UploadEmptyError({ message: "Empty upload body" });
    }
    const detection = detectFormat(input.bytes, input.declaredMimeType, input.filename);
    if (!detection) {
      throw new UnsupportedFormatError({
        mimeType: input.declaredMimeType ?? undefined,
        filename: input.filename,
      });
    }

    const id = crypto.randomUUID();
    const sha256 = await sha256Hex(input.bytes);
    const ext = extensionFor(detection.kind, input.filename);
    const r2KeyOriginal = `users/${input.userId}/documents/${id}/original${ext}`;

    await DocumentAssetStore.putOriginal(input.userId, id, ext, input.bytes, detection.mimeType);

    let entity: Entity;
    try {
      entity = await DocumentStorage.create({
        id,
        userId: input.userId,
        kind: detection.kind,
        mimeType: detection.mimeType,
        originalFilename: input.filename,
        sizeBytes: input.bytes.byteLength,
        sha256,
        title: titleFromFilename(input.filename),
        sensitive: input.sensitive,
        status: "processing",
        r2KeyOriginal,
      });
    } catch (e) {
      // Rollback the R2 write so a half-created document doesn't sit in the
      // bucket — the user retries cleanly.
      await DocumentAssetStore.removeAll(input.userId, id).catch(() => {});
      throw e;
    }

    try {
      await triggerProcessing(id);
    } catch (e) {
      // Workflow trigger failed (e.g. binding misconfigured). Leave the row
      // and blob so a manual reprocess is possible, but surface the failure
      // as the document's recorded error.
      await DocumentStorage.markFailed(id, `Failed to start processing: ${(e as Error).message}`);
    }

    return entity;
  };

  export const list = async (userId: string): Promise<Entity[]> => DocumentStorage.list(userId);

  export const get = async (userId: string, id: string): Promise<Entity> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) throw new NotFoundError({ id });
    return entity;
  };

  export const getStatus = async (userId: string, id: string): Promise<StatusPayload> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) throw new NotFoundError({ id });
    return { id: entity.id, status: entity.status, errorReason: entity.errorReason };
  };

  export const remove = async (userId: string, id: string): Promise<void> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) throw new NotFoundError({ id });
    // R2 first so a failed asset cleanup doesn't orphan blobs we can no
    // longer find. The D1 row can always be re-deleted.
    await DocumentAssetStore.removeAll(userId, id);
    await DocumentStorage.remove(id, userId);
  };

  export const update = async (userId: string, id: string, input: UpdateInput): Promise<Entity> => {
    const updated = await DocumentStorage.updateTitle(id, userId, input.title);
    if (!updated) throw new NotFoundError({ id });
    // Refetch via the joined read so the response carries the up-to-date
    // progress alongside the renamed title — the writer doesn't bother
    // joining itself.
    return get(userId, id);
  };

  export const getOriginal = async (
    userId: string,
    id: string,
  ): Promise<DocumentAssetStore.Asset | null> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) return null;
    return DocumentAssetStore.getOriginal(userId, id, entity.r2KeyOriginal);
  };

  export const getAsset = async (
    userId: string,
    id: string,
    name: string,
  ): Promise<DocumentAssetStore.Asset | null> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) return null;
    return DocumentAssetStore.getAsset(userId, id, name);
  };

  // ---- Format-specific accessors ----------------------------------------
  export const getEpubDetail = async (userId: string, id: string): Promise<Epub.Detail> => {
    const entity = await getProcessed(userId, id, "epub");
    const [book, toc, chapters] = await Promise.all([
      EpubStorage.get(id, userId),
      EpubStorage.getToc(id, userId),
      EpubStorage.listChapterSummaries(id, userId),
    ]);
    if (!book) {
      throw new NotProcessedError({ id, status: entity.status, message: "EPUB book row missing" });
    }
    return { book, toc: toc ?? [], chapters: chapters ?? [] };
  };

  export const getEpubChapter = async (
    userId: string,
    id: string,
    order: number,
  ): Promise<Epub.Chapter> => {
    await getProcessed(userId, id, "epub");
    const chapter = await EpubStorage.getChapter(id, order, userId);
    if (!chapter) throw new Epub.ChapterNotFoundError({ documentId: id, order });
    return chapter;
  };

  // ---- Helpers (feature-local) ------------------------------------------
  const getProcessed = async (userId: string, id: string, expected: Kind): Promise<Entity> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) throw new NotFoundError({ id });
    if (entity.kind !== expected) {
      throw new WrongKindError({ id, expected, actual: entity.kind });
    }
    if (entity.status !== "processed") {
      throw new NotProcessedError({ id, status: entity.status });
    }
    return entity;
  };

  const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
    const buffer = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
    const view = new Uint8Array(buffer);
    let out = "";
    for (let i = 0; i < view.length; i++) {
      out += view[i].toString(16).padStart(2, "0");
    }
    return out;
  };

  const titleFromFilename = (filename: string): string => {
    const dot = filename.lastIndexOf(".");
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    return stem.trim() || filename || "Untitled";
  };

  const extensionFor = (_kind: Kind, filename: string): string => {
    const dot = filename.lastIndexOf(".");
    if (dot > 0) {
      const ext = filename.slice(dot).toLowerCase();
      if (/^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
    }
    return ".epub";
  };
}
