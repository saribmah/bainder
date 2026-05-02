import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { RuntimeEnv } from "../../../app/context";
import { createDb } from "../../../db/db";
import { Instance } from "../../../instance";
import { createAnonymousAuth } from "../../../middleware/auth";
import {
  loadDocument,
  markProcessed,
  parseAndRender,
  recordFailure,
  resetRendered,
  writeManifest,
} from "./steps";

export type EpubWorkflowParams = { documentId: string };

// Cloudflare Workflow class. One instance per upload (instance ID ==
// document ID). Each step is its own checkpoint with its own retry policy
// so a transient failure replays just that checkpoint instead of restarting
// from parse. Workflows resume in fresh invocations across step boundaries,
// so we re-establish the AsyncLocalStorage frame inside each step body
// rather than once at the top of `run`.
//
// Step bodies live in `./steps.ts` so the unit-test runtime can import them
// without pulling the `cloudflare:workers` virtual module (which only
// resolves inside the Worker runtime).
export class EpubWorkflow extends WorkflowEntrypoint<RuntimeEnv, EpubWorkflowParams> {
  override async run(event: WorkflowEvent<EpubWorkflowParams>, step: WorkflowStep): Promise<void> {
    const { documentId } = event.payload;
    const env = this.env;
    const provide = <R>(fn: () => Promise<R>): Promise<R> => {
      const db = createDb(env);
      return Instance.provide({ auth: createAnonymousAuth(), env, db }, fn);
    };

    try {
      const loaded = await step.do(
        "loadDocument",
        {
          retries: { limit: 3, delay: "1 second", backoff: "exponential" },
          timeout: "30 seconds",
        },
        () => provide(() => loadDocument(documentId)),
      );
      await step.do(
        "resetRendered",
        {
          retries: { limit: 5, delay: "2 seconds", backoff: "exponential" },
          timeout: "1 minute",
        },
        () => provide(() => resetRendered(loaded.userId, documentId)),
      );
      const manifest = await step.do(
        "parseAndRender",
        {
          retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
          timeout: "5 minutes",
        },
        () => provide(() => parseAndRender(loaded.userId, documentId, loaded.originalKey)),
      );
      const finalized = await step.do(
        "writeManifest",
        {
          retries: { limit: 5, delay: "2 seconds", backoff: "exponential" },
          timeout: "1 minute",
        },
        () => provide(() => writeManifest(loaded.userId, documentId, manifest)),
      );
      await step.do(
        "markProcessed",
        {
          retries: { limit: 5, delay: "2 seconds", backoff: "exponential" },
          timeout: "30 seconds",
        },
        () => provide(() => markProcessed(documentId, finalized)),
      );
    } catch (error) {
      await step.do("markFailed", () => provide(() => recordFailure(documentId, error)));
    }
  }
}
