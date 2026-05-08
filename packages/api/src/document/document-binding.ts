import { z } from "zod";
import { Instance } from "../instance";
import { NamedError } from "../utils/error";
import type { DocumentDO } from "./document-do";

// Typed accessor for the per-document DocumentDO Durable Object stub.
// Routes/features go through this — only this module touches
// `Instance.env.DOCUMENT`. Mirrors the Binder accessor pattern.
//
// `import type { DocumentDO }` keeps this file free of any
// `cloudflare:workers` runtime dependency, so storage/workflow modules
// that depend on the accessor remain unit-testable under bun:test.
export namespace DocumentBinding {
  export const NotConfiguredError = NamedError.create(
    "DocumentDONotConfiguredError",
    z.object({ message: z.string().optional() }),
  );
  export type NotConfiguredError = InstanceType<typeof NotConfiguredError>;

  export const require = (documentId: string): DurableObjectStub<DocumentDO> => {
    const namespace = Instance.env.DOCUMENT;
    if (!namespace) throw new NotConfiguredError({});
    const id = namespace.idFromName(documentId);
    return namespace.get(id);
  };
}
