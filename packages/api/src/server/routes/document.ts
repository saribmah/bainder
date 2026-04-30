import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Document } from "../../document/document";
import { Epub } from "../../document/formats/epub/epub";
import { Image } from "../../document/formats/image/image";
import { Pdf } from "../../document/formats/pdf/pdf";
import { Text } from "../../document/formats/text/text";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { createErrorMapper } from "../error-mapper";

const documentRouter = new Hono<AppEnv>();

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

documentRouter.post(
  "/",
  describeRoute({
    summary: "Upload a document",
    description:
      "Multipart upload. Required field `file` (binary). Optional `sensitive` (boolean string). Returns the created document with status='processing'; processing runs asynchronously via Workflow.",
    operationId: "document.create",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["file"],
            properties: {
              file: { type: "string", format: "binary" },
              sensitive: { type: "string", enum: ["true", "false"] },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: "Document created (processing started)",
        content: { "application/json": { schema: resolver(Document.Entity) } },
      },
      400: { description: "Invalid request" },
      401: { description: "Not authenticated" },
      413: { description: "Upload exceeds size limit" },
      415: { description: "Unsupported file format" },
    },
  }),
  requireAuth,
  async (c) => {
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ message: "Expected multipart/form-data body" }, 400);
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return c.json({ message: "Missing or empty `file`" }, 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ message: "Upload exceeds size limit" }, 413);
    }

    const sensitiveRaw = formData.get("sensitive");
    const sensitive = typeof sensitiveRaw === "string" && sensitiveRaw.toLowerCase() === "true";

    const bytes = new Uint8Array(await file.arrayBuffer());
    const filename = file.name || "upload.bin";
    const declaredMimeType = file.type || null;

    const mapError = createErrorMapper([
      { error: Document.UploadEmptyError, status: 400 },
      { error: Document.UploadTooLargeError, status: 413 },
      { error: Document.UnsupportedFormatError, status: 415 },
    ]);

    try {
      const entity = await Document.create(
        { userId: Instance.userId, bytes, filename, declaredMimeType, sensitive },
        async (documentId) => {
          await Instance.env.DOCUMENT_PROCESSOR.create({
            id: documentId,
            params: { documentId },
          });
        },
      );
      return c.json(entity, 201);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/",
  describeRoute({
    summary: "List documents",
    operationId: "document.list",
    responses: {
      200: {
        description: "All documents owned by the caller",
        content: { "application/json": { schema: resolver(Document.ListResponse) } },
      },
      401: { description: "Not authenticated" },
    },
  }),
  requireAuth,
  async (c) => {
    const items = await Document.list(Instance.userId);
    return c.json({ items });
  },
);

documentRouter.get(
  "/:id",
  describeRoute({
    summary: "Get a document",
    operationId: "document.get",
    responses: {
      200: {
        description: "Document metadata",
        content: { "application/json": { schema: resolver(Document.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper([{ error: Document.NotFoundError, status: 404 }]);
    try {
      const entity = await Document.get(Instance.userId, id);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/status",
  describeRoute({
    summary: "Get processing status",
    description: "Lightweight payload for polling while a document is being processed.",
    operationId: "document.getStatus",
    responses: {
      200: {
        description: "Processing status",
        content: { "application/json": { schema: resolver(Document.StatusPayload) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper([{ error: Document.NotFoundError, status: 404 }]);
    try {
      const status = await Document.getStatus(Instance.userId, id);
      return c.json(status);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.delete(
  "/:id",
  describeRoute({
    summary: "Delete a document",
    operationId: "document.delete",
    responses: {
      204: { description: "Deleted" },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper([{ error: Document.NotFoundError, status: 404 }]);
    try {
      await Document.remove(Instance.userId, id);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/raw",
  describeRoute({
    summary: "Stream the original document blob",
    operationId: "document.getRaw",
    responses: {
      200: {
        description: "Original bytes",
        content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const asset = await Document.getOriginal(Instance.userId, id);
    if (!asset) return c.body(null, 404);
    return c.body(asset.body, 200, {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "private, max-age=3600",
    });
  },
);

// Derived asset (e.g. EPUB images extracted at parse time, addressed in
// chapter HTML as `assets/{name}` relative URLs).
documentRouter.get(
  "/:id/assets/:name",
  describeRoute({
    summary: "Fetch a derived document asset by name",
    operationId: "document.getAsset",
    responses: {
      200: {
        description: "Asset bytes",
        content: { "image/*": { schema: { type: "string", format: "binary" } } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const name = c.req.param("name");
    const asset = await Document.getAsset(Instance.userId, id, name);
    if (!asset) return c.body(null, 404);
    return c.body(asset.body, 200, {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "private, max-age=3600",
    });
  },
);

// ---- Format-specific reading endpoints --------------------------------
const formatErrorMappings = [
  { error: Document.NotFoundError, status: 404 as const },
  { error: Document.WrongKindError, status: 404 as const },
  { error: Document.NotProcessedError, status: 409 as const },
];

documentRouter.get(
  "/:id/epub",
  describeRoute({
    summary: "Get EPUB book detail (book metadata + TOC + chapter summaries)",
    operationId: "document.getEpubDetail",
    responses: {
      200: {
        description: "EPUB detail",
        content: { "application/json": { schema: resolver(Epub.Detail) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found or wrong kind" },
      409: { description: "Document not yet processed" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(formatErrorMappings);
    try {
      const detail = await Document.getEpubDetail(Instance.userId, id);
      return c.json(detail);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/epub/chapters/:order",
  describeRoute({
    summary: "Get a single EPUB chapter by linear order",
    operationId: "document.getEpubChapter",
    responses: {
      200: {
        description: "Chapter content (cleaned HTML and plain text)",
        content: { "application/json": { schema: resolver(Epub.Chapter) } },
      },
      400: { description: "Invalid chapter order" },
      401: { description: "Not authenticated" },
      404: { description: "Document or chapter not found" },
      409: { description: "Document not yet processed" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const orderRaw = c.req.param("order");
    const order = Number(orderRaw);
    if (!Number.isInteger(order) || order < 0) {
      return c.json({ message: "Invalid chapter order" }, 400);
    }
    const mapError = createErrorMapper([
      ...formatErrorMappings,
      { error: Epub.ChapterNotFoundError, status: 404 },
    ]);
    try {
      const chapter = await Document.getEpubChapter(Instance.userId, id, order);
      return c.json(chapter);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/pdf",
  describeRoute({
    summary: "Get PDF detail (metadata + page summaries)",
    operationId: "document.getPdfDetail",
    responses: {
      200: {
        description: "PDF detail",
        content: { "application/json": { schema: resolver(Pdf.Detail) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found or wrong kind" },
      409: { description: "Document not yet processed" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(formatErrorMappings);
    try {
      const detail = await Document.getPdfDetail(Instance.userId, id);
      return c.json(detail);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/pdf/pages/:page",
  describeRoute({
    summary: "Get a single PDF page by page number",
    operationId: "document.getPdfPage",
    responses: {
      200: {
        description: "Page text and metadata",
        content: { "application/json": { schema: resolver(Pdf.Page) } },
      },
      400: { description: "Invalid page number" },
      401: { description: "Not authenticated" },
      404: { description: "Document or page not found" },
      409: { description: "Document not yet processed" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const pageRaw = c.req.param("page");
    const pageNumber = Number(pageRaw);
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return c.json({ message: "Invalid page number" }, 400);
    }
    const mapError = createErrorMapper([
      ...formatErrorMappings,
      { error: Pdf.PageNotFoundError, status: 404 },
    ]);
    try {
      const page = await Document.getPdfPage(Instance.userId, id, pageNumber);
      return c.json(page);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/image",
  describeRoute({
    summary: "Get image metadata (width, height, format)",
    operationId: "document.getImage",
    responses: {
      200: {
        description: "Image metadata",
        content: { "application/json": { schema: resolver(Image.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found or wrong kind" },
      409: { description: "Document not yet processed" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(formatErrorMappings);
    try {
      const image = await Document.getImage(Instance.userId, id);
      return c.json(image);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

documentRouter.get(
  "/:id/text",
  describeRoute({
    summary: "Get decoded text content",
    operationId: "document.getText",
    responses: {
      200: {
        description: "Text content",
        content: { "application/json": { schema: resolver(Text.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found or wrong kind" },
      409: { description: "Document not yet processed" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(formatErrorMappings);
    try {
      const text = await Document.getText(Instance.userId, id);
      return c.json(text);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default documentRouter;
