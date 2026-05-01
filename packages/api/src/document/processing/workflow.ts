import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { RuntimeEnv } from "../../app/context";
import { createDb } from "../../db/db";
import { Instance } from "../../instance";
import { createAnonymousAuth } from "../../middleware/auth";
import { formatErrorChain } from "../../utils/error";
import { DocumentStorage } from "../storage";
import { processDocument } from "./pipeline";

// `error_reason` is exposed to users on the failed-document row, so cap the
// chained message before it balloons (drizzle's query-error message alone
// can run multiple kilobytes of bound parameters).
const MAX_REASON_LENGTH = 2000;

export type DocumentProcessorParams = { documentId: string };

// Cloudflare Workflow that runs the parse pipeline outside the request path.
// One instance per upload (instance ID == document ID). Retries are bounded
// so a permanently-broken document doesn't loop forever; final failure is
// recorded on the document row so the user can see what went wrong.
export class DocumentProcessor extends WorkflowEntrypoint<RuntimeEnv, DocumentProcessorParams> {
  // Each step.do callback runs inside `Instance.provide(...)`. Workflows can
  // resume in a fresh invocation across step boundaries, so we re-establish
  // the AsyncLocalStorage frame inside each step rather than once at the top
  // of `run`.
  override async run(
    event: WorkflowEvent<DocumentProcessorParams>,
    step: WorkflowStep,
  ): Promise<void> {
    const { documentId } = event.payload;
    const env = this.env;

    try {
      await step.do(
        "process",
        {
          retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
          timeout: "5 minutes",
        },
        async () => {
          const db = createDb(env);
          await Instance.provide({ auth: createAnonymousAuth(), env, db }, async () => {
            await processDocument(documentId);
          });
        },
      );
    } catch (error) {
      const chained = formatErrorChain(error);
      const reason = (chained || "Processing failed").slice(0, MAX_REASON_LENGTH);
      await step.do("markFailed", async () => {
        const db = createDb(env);
        await Instance.provide({ auth: createAnonymousAuth(), env, db }, async () => {
          await DocumentStorage.markFailed(documentId, reason);
        });
      });
    }
  }
}
