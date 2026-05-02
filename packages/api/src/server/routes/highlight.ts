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
];

highlightRouter.post(
  "/",
  describeRoute({
    summary: "Create a highlight or note on a document",
    description:
      "Creates a colour highlight (and optional note) anchored to a document section via `sectionKey` (from the manifest). `position.offsetStart` / `offsetEnd` are character positions into the section's canonical `.txt` payload.",
    operationId: "highlight.create",
    responses: {
      201: {
        description: "Created",
        content: { "application/json": { schema: resolver(Highlight.Entity) } },
      },
      400: { description: "Invalid input" },
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
      "Returns highlights owned by the caller for the given `documentId`, ordered by creation time. Optional `sectionKey` query param scopes the result to a single section (e.g. one EPUB chapter).",
    operationId: "highlight.list",
    parameters: [
      { name: "documentId", in: "query", required: true, schema: { type: "string" } },
      {
        name: "sectionKey",
        in: "query",
        required: false,
        schema: { type: "string" },
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

    const sectionKey = c.req.query("sectionKey");
    const query: Highlight.ListQuery = { documentId };
    if (sectionKey !== undefined) {
      if (sectionKey.length === 0 || sectionKey.length > 200) {
        return c.json({ message: "Invalid sectionKey" }, 400);
      }
      query.sectionKey = sectionKey;
    }

    const mapError = createErrorMapper(errorMappings);
    try {
      const items = await Highlight.list(Instance.userId, query);
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
