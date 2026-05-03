import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Document } from "../../document/document";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { Shelf } from "../../shelf/shelf";
import { createErrorMapper } from "../error-mapper";

const shelfRouter = new Hono<AppEnv>();

const errorMappings = [
  { error: Shelf.NotFoundError, status: 404 as const },
  { error: Shelf.NameTakenError, status: 409 as const },
  { error: Shelf.SmartShelfWriteError, status: 409 as const },
  { error: Shelf.DocumentNotOnShelfError, status: 404 as const },
  { error: Document.NotFoundError, status: 404 as const },
];

shelfRouter.get(
  "/",
  describeRoute({
    summary: "List shelves",
    description:
      "Returns smart shelves (Currently reading, Finished) followed by user-created shelves. Each item carries an `itemCount` so a sidebar can render counts in one round-trip.",
    operationId: "shelf.list",
    responses: {
      200: {
        description: "Shelves owned by the caller, smart shelves first",
        content: { "application/json": { schema: resolver(Shelf.ListResponse) } },
      },
      401: { description: "Not authenticated" },
    },
  }),
  requireAuth,
  async (c) => {
    const items = await Shelf.list(Instance.userId);
    return c.json({ items });
  },
);

shelfRouter.post(
  "/",
  describeRoute({
    summary: "Create a custom shelf",
    description:
      "Creates a user-owned shelf. Names must be unique per user, case-insensitive — `design` and `Design` collide.",
    operationId: "shelf.create",
    responses: {
      201: {
        description: "Created",
        content: { "application/json": { schema: resolver(Shelf.CustomEntity) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      409: { description: "A shelf with this name already exists" },
    },
  }),
  requireAuth,
  validator("json", Shelf.CreateInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Shelf.create(Instance.userId, body);
      return c.json(entity, 201);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.get(
  "/:id",
  describeRoute({
    summary: "Get a shelf",
    description:
      "Accepts both custom shelf UUIDs and smart shelf identifiers (`smart:reading`, `smart:finished`).",
    operationId: "shelf.get",
    responses: {
      200: {
        description: "Shelf",
        content: { "application/json": { schema: resolver(Shelf.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Shelf.get(Instance.userId, id);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.patch(
  "/:id",
  describeRoute({
    summary: "Update a custom shelf",
    description:
      "Renames, edits the description, or repositions a custom shelf. `position` is a fractional sort key — clients pick a midpoint between neighbours; the server stores it verbatim. Smart shelves cannot be modified.",
    operationId: "shelf.update",
    responses: {
      200: {
        description: "Updated",
        content: { "application/json": { schema: resolver(Shelf.CustomEntity) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
      409: { description: "Name already taken or shelf is smart" },
    },
  }),
  requireAuth,
  validator("json", Shelf.UpdateInput),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Shelf.update(Instance.userId, id, body);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.delete(
  "/:id",
  describeRoute({
    summary: "Delete a custom shelf",
    description: "Cascades shelf membership rows. Smart shelves cannot be deleted.",
    operationId: "shelf.delete",
    responses: {
      204: { description: "Deleted" },
      401: { description: "Not authenticated" },
      404: { description: "Not found" },
      409: { description: "Shelf is smart and cannot be deleted" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Shelf.remove(Instance.userId, id);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.get(
  "/:id/documents",
  describeRoute({
    summary: "List documents on a shelf",
    description:
      "Returns the documents on the shelf in their stored order. For custom shelves: position ASC NULLS LAST then addedAt ASC. For smart shelves: progress.updatedAt DESC.",
    operationId: "shelf.listDocuments",
    responses: {
      200: {
        description: "Documents on the shelf",
        content: { "application/json": { schema: resolver(Shelf.DocumentListResponse) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Shelf not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(errorMappings);
    try {
      const items = await Shelf.listDocuments(Instance.userId, id);
      return c.json({ items });
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.put(
  "/:id/documents/:documentId",
  describeRoute({
    summary: "Add a document to a shelf",
    description:
      "Idempotent. Re-adding a document already on the shelf is a no-op and preserves the original addedAt and position. Smart shelves cannot be written to.",
    operationId: "shelf.addDocument",
    responses: {
      204: { description: "Added (or already present)" },
      401: { description: "Not authenticated" },
      404: { description: "Shelf or document not found" },
      409: { description: "Shelf is smart" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const documentId = c.req.param("documentId");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Shelf.addDocument(Instance.userId, id, documentId);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.delete(
  "/:id/documents/:documentId",
  describeRoute({
    summary: "Remove a document from a shelf",
    operationId: "shelf.removeDocument",
    responses: {
      204: { description: "Removed" },
      401: { description: "Not authenticated" },
      404: { description: "Shelf not found, or document is not on the shelf" },
      409: { description: "Shelf is smart" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const documentId = c.req.param("documentId");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Shelf.removeDocument(Instance.userId, id, documentId);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

shelfRouter.patch(
  "/:id/documents/:documentId",
  describeRoute({
    summary: "Reorder a document within a shelf",
    description:
      "Sets the document's `position` within the shelf. Clients pick a midpoint between neighbours; pass `null` to drop back to addedAt-based ordering.",
    operationId: "shelf.reorderDocument",
    responses: {
      204: { description: "Reordered" },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Shelf not found, or document is not on the shelf" },
      409: { description: "Shelf is smart" },
    },
  }),
  requireAuth,
  validator("json", Shelf.ReorderDocumentInput),
  async (c) => {
    const id = c.req.param("id");
    const documentId = c.req.param("documentId");
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Shelf.reorderDocument(Instance.userId, id, documentId, body);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default shelfRouter;
