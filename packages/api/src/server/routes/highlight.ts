import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Document } from "../../document/document";
import { Highlight } from "../../highlight/highlight";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { createErrorMapper } from "../error-mapper";

const highlightRouter = new Hono<AppEnv>();

const errorMappings = [
  { error: Document.NotFoundError, status: 404 as const },
  { error: Highlight.NotFoundError, status: 404 as const },
  { error: Highlight.InvalidTargetError, status: 400 as const },
];

highlightRouter.post(
  "/",
  describeRoute({
    summary: "Create a highlight or note on a document",
    description:
      "Creates a colour highlight (and optional note) anchored to either an EPUB chapter (`epubChapterOrder`) or a PDF page (`pdfPageNumber`). Offsets are character positions into the canonical text payload — `epub_chapter.html`'s textContent or `pdf_page.text`. Exactly one of the two target fields must be set.",
    operationId: "highlight.create",
    responses: {
      201: {
        description: "Created",
        content: { "application/json": { schema: resolver(Highlight.Entity) } },
      },
      400: { description: "Invalid input or target mismatched with document kind" },
      401: { description: "Not authenticated" },
      404: { description: "Document not found" },
    },
  }),
  requireAuth,
  validator("json", Highlight.CreateInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Highlight.create(Instance.userId, body);
      return c.json(entity, 201);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

highlightRouter.get(
  "/",
  describeRoute({
    summary: "List highlights for a document",
    description:
      "Returns highlights owned by the caller for the given `documentId`, ordered by creation time. Optional `epubChapterOrder` or `pdfPageNumber` query params scope the result to a single chapter or page.",
    operationId: "highlight.list",
    parameters: [
      { name: "documentId", in: "query", required: true, schema: { type: "string" } },
      {
        name: "epubChapterOrder",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 0 },
      },
      {
        name: "pdfPageNumber",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1 },
      },
    ],
    responses: {
      200: {
        description: "Highlights",
        content: { "application/json": { schema: resolver(Highlight.ListResponse) } },
      },
      400: { description: "Invalid query" },
      401: { description: "Not authenticated" },
      404: { description: "Document not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const documentId = c.req.query("documentId");
    if (!documentId) return c.json({ message: "documentId is required" }, 400);

    const chapterRaw = c.req.query("epubChapterOrder");
    const pageRaw = c.req.query("pdfPageNumber");
    let epubChapterOrder: number | undefined;
    let pdfPageNumber: number | undefined;
    if (chapterRaw !== undefined) {
      const n = Number(chapterRaw);
      if (!Number.isInteger(n) || n < 0) {
        return c.json({ message: "Invalid epubChapterOrder" }, 400);
      }
      epubChapterOrder = n;
    }
    if (pageRaw !== undefined) {
      const n = Number(pageRaw);
      if (!Number.isInteger(n) || n < 1) {
        return c.json({ message: "Invalid pdfPageNumber" }, 400);
      }
      pdfPageNumber = n;
    }

    const mapError = createErrorMapper(errorMappings);
    try {
      const items = await Highlight.list(Instance.userId, {
        documentId,
        epubChapterOrder,
        pdfPageNumber,
      });
      return c.json({ items });
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

highlightRouter.patch(
  "/:id",
  describeRoute({
    summary: "Update a highlight's color or note",
    operationId: "highlight.update",
    responses: {
      200: {
        description: "Updated",
        content: { "application/json": { schema: resolver(Highlight.Entity) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Highlight not found" },
    },
  }),
  requireAuth,
  validator("json", Highlight.UpdateInput),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Highlight.update(Instance.userId, id, body);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

highlightRouter.delete(
  "/:id",
  describeRoute({
    summary: "Delete a highlight",
    operationId: "highlight.delete",
    responses: {
      204: { description: "Deleted" },
      401: { description: "Not authenticated" },
      404: { description: "Highlight not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Highlight.remove(Instance.userId, id);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default highlightRouter;
