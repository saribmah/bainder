import { z } from "zod";
import { Instance } from "../instance";
import { NamedError } from "../utils/error";
import type { BinderDO } from "./binder-do";

// Typed accessor for the per-user BinderDO Durable Object stub. Routes and
// feature modules go through this — only this module touches
// `Instance.env.BINDER`. Mirrors the `Agent.destroy` accessor pattern.
//
// Importing `BinderDO` as a type-only import keeps this file free of any
// `cloudflare:workers` runtime dependency, so storage modules that depend
// on the accessor remain unit-testable under the bun test runtime.
export namespace Binder {
  export const NotConfiguredError = NamedError.create(
    "BinderDONotConfiguredError",
    z.object({ message: z.string().optional() }),
  );
  export type NotConfiguredError = InstanceType<typeof NotConfiguredError>;

  export const require = (userId: string): DurableObjectStub<BinderDO> => {
    const namespace = Instance.env.BINDER;
    if (!namespace) throw new NotConfiguredError({});
    const id = namespace.idFromName(userId);
    return namespace.get(id);
  };
}
