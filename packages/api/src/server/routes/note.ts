import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Document } from "../../document/document";
import { Highlight } from "../../highlight/highlight";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { Note } from "../../note/note";
import { createErrorMapper } from "../error-mapper";

const noteRouter = new Hono<AppEnv>();

const errorMappings = [
  { error: Document.NotFoundError, status: 404 as const },
  { error: Highlight.NotFoundError, status: 404 as const },
  { error: Note.NotFoundError, status: 404 as const },
  { error: Note.HighlightDocumentMismatchError, status: 400 as const },
];

noteRouter.post(
  "/",
  describeRoute({
    summary: "Create a note on a document",
    description:
      "Creates a free-form note. With neither `sectionKey` nor `highlightId` set, the note is document-level. With `sectionKey` set, it pins to a section. With `highlightId` set, it comments on a highlight (and the highlight's section is mirrored onto the note automatically).",
    operationId: "note.create",
    responses: {
      201: {
        description: "Created",
        content: { "application/json": { schema: resolver(Note.Entity) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Document or highlight not found" },
    },
  }),
  requireAuth,
  validator("json", Note.CreateInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Note.create(Instance.userId, body);
      return c.json(entity, 201);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

noteRouter.get(
  "/",
  describeRoute({
    summary: "List notes for a document",
    description:
      "Returns notes owned by the caller for the given `documentId`, ordered by creation time. Optional filters: `sectionKey` scopes to a section; `highlightId` scopes to comments on a single highlight; `unanchored=true` returns only document-level notes (no section, no highlight).",
    operationId: "note.list",
    parameters: [
      { name: "documentId", in: "query", required: true, schema: { type: "string" } },
      { name: "sectionKey", in: "query", required: false, schema: { type: "string" } },
      { name: "highlightId", in: "query", required: false, schema: { type: "string" } },
      { name: "unanchored", in: "query", required: false, schema: { type: "boolean" } },
    ],
    responses: {
      200: {
        description: "Notes",
        content: { "application/json": { schema: resolver(Note.ListResponse) } },
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
    const highlightId = c.req.query("highlightId");
    const unanchored = c.req.query("unanchored");

    const query: Note.ListQuery = { documentId };
    if (sectionKey !== undefined) {
      if (sectionKey.length === 0 || sectionKey.length > 200) {
        return c.json({ message: "Invalid sectionKey" }, 400);
      }
      query.sectionKey = sectionKey;
    }
    if (highlightId !== undefined) {
      if (highlightId.length === 0) {
        return c.json({ message: "Invalid highlightId" }, 400);
      }
      query.highlightId = highlightId;
    }
    if (unanchored !== undefined) {
      if (unanchored !== "true" && unanchored !== "false") {
        return c.json({ message: "unanchored must be true or false" }, 400);
      }
      query.unanchored = unanchored === "true";
    }

    const mapError = createErrorMapper(errorMappings);
    try {
      const items = await Note.list(Instance.userId, query);
      return c.json({ items });
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

noteRouter.get(
  "/:id",
  describeRoute({
    summary: "Get a single note",
    operationId: "note.get",
    responses: {
      200: {
        description: "Note",
        content: { "application/json": { schema: resolver(Note.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Note not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Note.get(Instance.userId, id);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

noteRouter.patch(
  "/:id",
  describeRoute({
    summary: "Update a note's body",
    operationId: "note.update",
    responses: {
      200: {
        description: "Updated",
        content: { "application/json": { schema: resolver(Note.Entity) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Note not found" },
    },
  }),
  requireAuth,
  validator("json", Note.UpdateInput),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const entity = await Note.update(Instance.userId, id, body);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

noteRouter.delete(
  "/:id",
  describeRoute({
    summary: "Delete a note",
    operationId: "note.delete",
    responses: {
      204: { description: "Deleted" },
      401: { description: "Not authenticated" },
      404: { description: "Note not found" },
    },
  }),
  requireAuth,
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Note.remove(Instance.userId, id);
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default noteRouter;
