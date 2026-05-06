import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { tool } from "ai";
import { z } from "zod";
import type { RuntimeEnv } from "../app/context";
import { Document } from "../document/document";
import { Highlight } from "../highlight/highlight";
import { Note } from "../note/note";

// Tools the chat agent can call. Each tool's `execute` runs inside the
// Instance frame that ChatAgent.onChatMessage already provides — so
// existing storage modules (which read `Instance.db` from
// AsyncLocalStorage) work unchanged. The userId is derived from the
// conversation row in D1 (the DO instance name is the conversationId,
// not the userId).
export const buildAgentTools = ({ userId, env }: { userId: string; env: RuntimeEnv }) => {
  return {
    listDocuments: tool({
      description:
        "List documents in the user's binder, ordered by most recent. Use this to find what the user has uploaded before answering questions about specific items.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max items to return. Defaults to 50."),
      }),
      execute: async ({ limit }) => {
        const docs = await Document.list(userId);
        return docs.slice(0, limit ?? 50).map((d) => ({
          id: d.id,
          title: d.title,
          kind: d.kind,
          status: d.status,
          createdAt: d.createdAt,
        }));
      },
    }),

    listNotes: tool({
      description:
        "List the user's notes across the binder, most recent first. Optionally scope to one documentId. Notes are short user-authored annotations; the body field holds the actual note text.",
      inputSchema: z.object({
        documentId: z
          .string()
          .optional()
          .describe("If set, return only notes attached to this document."),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      execute: async ({ documentId, limit }) => {
        const notes = await Note.listAll(userId, { documentId, limit });
        return notes.map((n) => ({
          id: n.id,
          documentId: n.documentId,
          sectionKey: n.sectionKey,
          highlightId: n.highlightId,
          body: n.body,
          createdAt: n.createdAt,
        }));
      },
    }),

    listHighlights: tool({
      description:
        "List the user's highlights across the binder, most recent first. Optionally scope to one documentId. The textSnippet field holds the highlighted passage.",
      inputSchema: z.object({
        documentId: z
          .string()
          .optional()
          .describe("If set, return only highlights from this document."),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      execute: async ({ documentId, limit }) => {
        const highlights = await Highlight.listAll(userId, { documentId, limit });
        return highlights.map((h) => ({
          id: h.id,
          documentId: h.documentId,
          sectionKey: h.sectionKey,
          textSnippet: h.textSnippet,
          color: h.color,
          createdAt: h.createdAt,
        }));
      },
    }),

    runPython: tool({
      description:
        "Run Python 3 code in a per-user sandboxed Linux container and return its stdout/stderr/exitCode. Use for ad-hoc analysis over data you have already gathered with the listing tools — pass that data inline as Python literals. The sandbox has Python's standard library; the filesystem is reset on idle, so don't rely on persistent files.",
      inputSchema: z.object({
        code: z
          .string()
          .min(1)
          .max(8_000)
          .describe(
            "A self-contained Python 3 script. The script's stdout is returned to you verbatim, so write your answer to stdout (e.g. via print).",
          ),
      }),
      execute: async ({ code }) => {
        // One sandbox per user, shared across all of that user's
        // conversations. The Sandbox SDK lazily creates the underlying
        // container on first call and idle-evicts it after ~10 min of
        // inactivity, so the warm-path cost is just a method call.
        //
        // The cast is required because `wrangler types` emits
        // `DurableObjectNamespace /* Sandbox */` (no type parameter) for
        // bindings whose class is re-exported from a third-party package.
        // Local DO classes get a typed parameter; this one doesn't.
        const ns = env.Sandbox as DurableObjectNamespace<Sandbox>;
        const sandbox = getSandbox(ns, `user-${userId}`);
        // Write the script to a temp file rather than passing it via
        // `python3 -c <code>` so we sidestep shell-quoting hazards and
        // the host's argv length limit.
        const path = `/tmp/run-${crypto.randomUUID()}.py`;
        await sandbox.writeFile(path, code);
        const result = await sandbox.exec(`python3 ${path}`);
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        };
      },
    }),
  };
};
