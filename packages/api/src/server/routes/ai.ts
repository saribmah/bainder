import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { Ai } from "../../ai/ai";
import type { AppEnv } from "../../app/context";
import { Document } from "../../document/document";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { createErrorMapper } from "../error-mapper";

const aiRouter = new Hono<AppEnv>();

const errorMappings = [
  { error: Document.NotFoundError, status: 404 as const },
  { error: Ai.NotImplementedError, status: 501 as const },
];

aiRouter.post(
  "/search",
  describeRoute({
    summary: "Lexical search across the binder or within a document",
    description:
      "When `documentId` is omitted, runs a cross-binder FTS5 search and fans out to per-document snippet rendering. When `documentId` is set, runs a per-document search instead. Optional `kind` filters cross-binder hits by document kind (e.g. `epub`, `receipt`); `excludeDocumentId` and `excludeSectionKey` skip results from the supplied scope.",
    operationId: "ai.search",
    responses: {
      200: {
        description: "Ranked search hits with snippets",
        content: { "application/json": { schema: resolver(Ai.SearchResponse) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Document not found" },
    },
  }),
  requireAuth,
  validator("json", Ai.SearchInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const items = await Ai.search(Instance.userId, body);
      return c.json({ items });
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

aiRouter.post(
  "/read",
  describeRoute({
    summary: "Read a section's chunks (paginated)",
    description:
      "Returns ordered chunks for `sectionKey` from the document's per-document store, sliced by `offset` (chunk index) and `limit`. Used by the AI `read_section` tool.",
    operationId: "ai.read",
    responses: {
      200: {
        description: "Section chunks",
        content: { "application/json": { schema: resolver(Ai.ReadResponse) } },
      },
      400: { description: "Invalid input" },
      401: { description: "Not authenticated" },
      404: { description: "Document not found" },
    },
  }),
  requireAuth,
  validator("json", Ai.ReadInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      const result = await Ai.read(Instance.userId, body);
      return c.json(result);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

aiRouter.post(
  "/summarize",
  describeRoute({
    summary: "Generate or fetch a section/document summary",
    description:
      "Returns a cached summary keyed by `(targetType, targetKey, contentHash)` or generates a fresh one. Stub in v1 — returns 501 until the lazy-summary path lands.",
    operationId: "ai.summarize",
    responses: {
      200: {
        description: "Summary",
        content: { "application/json": { schema: { type: "object" } } },
      },
      401: { description: "Not authenticated" },
      501: { description: "Not implemented" },
    },
  }),
  requireAuth,
  validator("json", Ai.SummarizeInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper(errorMappings);
    try {
      await Ai.summarize(Instance.userId, body);
      // Unreachable while summarize throws NotImplementedError; kept so the
      // route shape is ready for Phase 6.
      return c.json({});
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default aiRouter;
