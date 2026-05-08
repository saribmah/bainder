import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { RuntimeEnv } from "../../app/context";
import { createDb } from "../../db/db";
import { Instance } from "../../instance";
import { createAnonymousAuth } from "../../middleware/auth";
import {
  destroyDocumentDO,
  removeBinderRow,
  sweepR2,
  type DocumentDeletionParams,
} from "./deletion-steps";

// Document deletion workflow. Three idempotent steps so retries are safe:
//   1. removeBinderRow — single-transaction cleanup of the catalog row +
//      child rows (highlights/notes/progress/shelf membership;
//      conversations.primary_document_id is NULLed where it pointed at
//      this doc). Re-running on an already-deleted row is a no-op.
//   2. destroyDocumentDO — wipes the per-document DO storage.
//   3. sweepR2 — paginated DELETE under the doc prefix. Missing keys are
//      no-ops, so replays don't fail.
//
// The route handler triggers the workflow and returns 202 immediately.
// Step bodies live in `./deletion-steps.ts` so the bun test runtime can
// re-use them via the fake DELETE_DOCUMENT binding.
export class DocumentDeletionWorkflow extends WorkflowEntrypoint<
  RuntimeEnv,
  DocumentDeletionParams
> {
  override async run(
    event: WorkflowEvent<DocumentDeletionParams>,
    step: WorkflowStep,
  ): Promise<void> {
    const params = event.payload;
    const env = this.env;
    const provide = <R>(fn: () => Promise<R>): Promise<R> => {
      const db = createDb(env);
      return Instance.provide({ auth: createAnonymousAuth(), env, db }, fn);
    };

    await step.do(
      "removeBinderRow",
      {
        retries: { limit: 5, delay: "2 seconds", backoff: "exponential" },
        timeout: "30 seconds",
      },
      () => provide(() => removeBinderRow(params)),
    );

    await step.do(
      "destroyDocumentDO",
      {
        retries: { limit: 5, delay: "2 seconds", backoff: "exponential" },
        timeout: "30 seconds",
      },
      () => provide(() => destroyDocumentDO(params)),
    );

    await step.do(
      "sweepR2",
      {
        retries: { limit: 5, delay: "5 seconds", backoff: "exponential" },
        timeout: "5 minutes",
      },
      () => provide(() => sweepR2(params)),
    );
  }
}
