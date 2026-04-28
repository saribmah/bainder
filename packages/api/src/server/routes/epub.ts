import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Epub } from "../../epub/epub";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { createErrorMapper } from "../error-mapper";

const epubRouter = new Hono<AppEnv>();

const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

epubRouter.post(
  "/",
  describeRoute({
    summary: "Ingest an EPUB file",
    description:
      "Upload the raw EPUB bytes (Content-Type: application/epub+zip). Parses metadata, chapters, and TOC; returns book metadata.",
    operationId: "epub.ingest",
    requestBody: {
      required: true,
      content: {
        "application/epub+zip": {
          schema: { type: "string", format: "binary" },
        },
        "application/octet-stream": {
          schema: { type: "string", format: "binary" },
        },
      },
    },
    responses: {
      201: {
        description: "Book ingested",
        content: { "application/json": { schema: resolver(Epub.Entity) } },
      },
      400: { description: "Invalid or unsupported EPUB" },
      401: { description: "Not authenticated" },
      413: { description: "Upload exceeds size limit" },
      422: { description: "EPUB had no readable chapters" },
    },
  }),
  requireAuth,
  async (c) => {
    const body = await c.req.arrayBuffer();
    if (body.byteLength === 0) {
      return c.json({ message: "Empty request body" }, 400);
    }
    if (body.byteLength > MAX_UPLOAD_BYTES) {
      return c.json({ message: "Upload exceeds size limit" }, 413);
    }
    const mapError = createErrorMapper([
      { error: Epub.EpubInvalidFormatError, status: 400 },
      { error: Epub.EpubEmptyError, status: 422 },
    ]);
    try {
      const entity = await Epub.ingest(Instance.userId, new Uint8Array(body));
      return c.json(entity, 201);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

epubRouter.get(
  "/",
  describeRoute({
    summary: "List ingested EPUBs",
    operationId: "epub.list",
    responses: {
      200: {
        description: "All ingested books",
        content: { "application/json": { schema: resolver(Epub.ListResponse) } },
      },
      401: { description: "Not authenticated" },
    },
  }),
  requireAuth,
  async (c) => {
    const items = await Epub.list(Instance.userId);
    return c.json({ items });
  },
);

epubRouter.get(
  "/:id",
  describeRoute({
    summary: "Get an EPUB with its TOC and chapter summaries",
    operationId: "epub.getDetail",
    responses: {
      200: {
        description: "Book detail",
        content: { "application/json": { schema: resolver(Epub.Detail) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper([{ error: Epub.EpubNotFoundError, status: 404 }]);
    try {
      const detail = await Epub.getDetail(Instance.userId, id);
      return c.json(detail);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

epubRouter.delete(
  "/:id",
  describeRoute({
    summary: "Delete an ingested EPUB",
    operationId: "epub.delete",
    responses: {
      204: { description: "Deleted" },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper([{ error: Epub.EpubNotFoundError, status: 404 }]);
    try {
      await Epub.remove(Instance.userId, id);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

epubRouter.get(
  "/:id/chapters/:order",
  describeRoute({
    summary: "Get a single chapter by linear order",
    operationId: "epub.getChapter",
    responses: {
      200: {
        description: "Chapter content (cleaned HTML and plain text)",
        content: { "application/json": { schema: resolver(Epub.Chapter) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Book or chapter not found" },
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
      { error: Epub.EpubNotFoundError, status: 404 },
      { error: Epub.EpubChapterNotFoundError, status: 404 },
    ]);
    try {
      const chapter = await Epub.getChapter(Instance.userId, id, order);
      return c.json(chapter);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

// Binary asset fetch: serves an image extracted from the EPUB during ingest.
// Stored chapter HTML uses `assets/{name}` tokens (relative paths) so the web
// reader rewrites them at render time to hit this route. The SDK is generated
// from this OpenAPI spec but won't produce a useful streaming method — clients
// fetch the URL directly.
epubRouter.get(
  "/:id/assets/:name",
  describeRoute({
    summary: "Fetch a book asset (image) by name",
    operationId: "epub.getAsset",
    responses: {
      200: {
        description: "Asset bytes",
        content: { "image/*": { schema: { type: "string", format: "binary" } } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Book or asset not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const name = c.req.param("name");
    const asset = await Epub.getAsset(Instance.userId, id, name);
    if (!asset) return c.body(null, 404);
    return c.body(asset.body, 200, {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "private, max-age=3600",
    });
  },
);

epubRouter.get(
  "/:id/context",
  describeRoute({
    summary: "Assemble AI-ready context across one or more chapters",
    description:
      "Returns concatenated chapter text suitable for an LLM prompt. Default range is the entire book.",
    operationId: "epub.getContext",
    responses: {
      200: {
        description: "Assembled context",
        content: { "application/json": { schema: resolver(Epub.ContextResponse) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Book or chapter range not found" },
    },
  }),
  requireAuth,
  validator("query", Epub.ContextQuery),
  async (c) => {
    const id = c.req.param("id");
    const query = c.req.valid("query");
    const mapError = createErrorMapper([
      { error: Epub.EpubNotFoundError, status: 404 },
      { error: Epub.EpubChapterNotFoundError, status: 404 },
    ]);
    try {
      const context = await Epub.getContext(Instance.userId, id, query);
      return c.json(context);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default epubRouter;
