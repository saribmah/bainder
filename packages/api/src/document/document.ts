import { z } from "zod";
import { NamedError } from "../utils/error";
import { DocumentAssetStore } from "./asset-store";
import { Epub } from "./formats/epub/epub";
import { detectFormat } from "./processing/detect";
import { Processor } from "./processing/processor";
import { DocumentStorage } from "./storage";

// User-visible binder primitive. One row per uploaded file. Format-specific
// content (chapters, page text, structured metadata) lives in R2 under the
// document's prefix and is described by `manifest.json`. The reader API
// surface is type-agnostic: `getManifest` / `getSectionHtml` / `getSectionText`
// work the same way regardless of `kind`.
//
// New formats are reintroduced one at a time via `.agents/add-format.md`.
export namespace Document {
  // ---- Errors -----------------------------------------------------------
  export const NotFoundError = NamedError.create(
    "DocumentNotFoundError",
    z.object({ id: z.string(), message: z.string().optional() }),
  );
  export type NotFoundError = InstanceType<typeof NotFoundError>;

  export const NotProcessedError = NamedError.create(
    "DocumentNotProcessedError",
    z.object({ id: z.string(), status: z.string(), message: z.string().optional() }),
  );
  export type NotProcessedError = InstanceType<typeof NotProcessedError>;

  export const ManifestMissingError = NamedError.create(
    "DocumentManifestMissingError",
    z.object({ id: z.string(), message: z.string().optional() }),
  );
  export type ManifestMissingError = InstanceType<typeof ManifestMissingError>;

  export const SectionNotFoundError = NamedError.create(
    "DocumentSectionNotFoundError",
    z.object({
      id: z.string(),
      order: z.number().int(),
      message: z.string().optional(),
    }),
  );
  export type SectionNotFoundError = InstanceType<typeof SectionNotFoundError>;

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
  export const ProgressSnapshot = z
    .object({
      sectionKey: z.string(),
      progressPercent: z.number().min(0).max(1).nullable(),
      updatedAt: z.string(),
    })
    .meta({ ref: "DocumentProgress" });
  export type ProgressSnapshot = z.infer<typeof ProgressSnapshot>;

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
      coverImage: z.string().nullable(),
      sourceUrl: z.string().nullable(),
      progress: ProgressSnapshot.nullable(),
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

  // ---- Manifest ---------------------------------------------------------
  // Type-agnostic per-section descriptor surfaced from manifest.json. The
  // reader navigates by `order`; `sectionKey` ties a section to its
  // highlight/progress rows; `files.html` and `files.text` are R2 keys
  // (relative to the document prefix's `content/` folder) that the
  // section-stream endpoints read from.
  export const SectionSummary = z
    .object({
      sectionKey: z.string(),
      order: z.number().int().nonnegative(),
      title: z.string(),
      wordCount: z.number().int().nonnegative(),
      // Format-specific reading-order signal. EPUB exposes spine `linear=no`
      // items here; non-paginated formats default to true.
      linear: z.boolean(),
      // Original-format href (e.g. EPUB OPF-relative chapter href). The
      // reader uses this to map TOC `fileHref` back to a section order.
      // Empty string when the format has no native href concept.
      href: z.string(),
      files: z.object({
        html: z.string(),
        text: z.string(),
      }),
    })
    .meta({ ref: "DocumentSectionSummary" });
  export type SectionSummary = z.infer<typeof SectionSummary>;

  // Discriminated union by `kind`. Today there's only one arm (EPUB);
  // adding `article`/`pdf` is one more arm + a new pipeline. Reader code
  // reads base fields without branching and only branches on `kind` when
  // it cares about format-specific metadata.
  const ManifestBase = z.object({
    schemaVersion: z.literal(1),
    title: z.string(),
    language: z.string(),
    coverImage: z.string().nullable(),
    chapterCount: z.number().int().nonnegative(),
    wordCount: z.number().int().nonnegative(),
    sections: z.array(SectionSummary),
  });

  export const EpubManifest = ManifestBase.extend({
    kind: z.literal("epub"),
    metadata: Epub.ManifestMetadata,
    toc: z.array(Epub.TocItem),
  }).meta({ ref: "EpubManifest" });
  export type EpubManifest = z.infer<typeof EpubManifest>;

  export const Manifest = z
    .discriminatedUnion("kind", [EpubManifest])
    .meta({ ref: "DocumentManifest" });
  export type Manifest = z.infer<typeof Manifest>;

  // ---- Operations -------------------------------------------------------
  export type CreateInput = {
    userId: string;
    bytes: Uint8Array;
    filename: string;
    declaredMimeType: string | null;
    sensitive: boolean;
  };

  // Persist the upload, kick off async processing, and return the row in
  // its `processing` state. The actual parse + render runs inside the
  // per-kind Cloudflare Workflow that `Processor.trigger` enqueues; tests
  // swap the binding's `create` for an inline runner via the test runtime.
  export const create = async (input: CreateInput): Promise<Entity> => {
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
      await Processor.trigger(detection.kind, id);
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

  // ---- Manifest accessors -----------------------------------------------
  export const getManifest = async (userId: string, id: string): Promise<Manifest> => {
    await getProcessed(userId, id);
    const manifest = await DocumentAssetStore.getManifest(userId, id, Manifest);
    if (!manifest) {
      throw new ManifestMissingError({ id, message: "Manifest not found in R2" });
    }
    return manifest;
  };

  export const getSectionHtml = async (
    userId: string,
    id: string,
    order: number,
  ): Promise<DocumentAssetStore.Asset> => {
    const manifest = await getManifest(userId, id);
    const section = manifest.sections.find((s) => s.order === order);
    if (!section) throw new SectionNotFoundError({ id, order });
    const asset = await DocumentAssetStore.getContent(userId, id, basename(section.files.html));
    if (!asset) throw new SectionNotFoundError({ id, order });
    return asset;
  };

  export const getSectionText = async (
    userId: string,
    id: string,
    order: number,
  ): Promise<DocumentAssetStore.Asset> => {
    const manifest = await getManifest(userId, id);
    const section = manifest.sections.find((s) => s.order === order);
    if (!section) throw new SectionNotFoundError({ id, order });
    const asset = await DocumentAssetStore.getContent(userId, id, basename(section.files.text));
    if (!asset) throw new SectionNotFoundError({ id, order });
    return asset;
  };

  // ---- Helpers (feature-local) ------------------------------------------
  const getProcessed = async (userId: string, id: string): Promise<Entity> => {
    const entity = await DocumentStorage.get(id, userId);
    if (!entity) throw new NotFoundError({ id });
    if (entity.status !== "processed") {
      throw new NotProcessedError({ id, status: entity.status });
    }
    return entity;
  };

  // Manifest stores `files.html` as a relative path under `content/`
  // (e.g. "content/0001-introduction.html"). The asset-store's
  // `getContent` already prefixes `content/` itself, so we strip the
  // leading folder here. Defensive against a manifest writer that omits it.
  const basename = (path: string): string => {
    const stripped = path.startsWith("content/") ? path.slice("content/".length) : path;
    return stripped;
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
