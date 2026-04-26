import type { AppEnv, AuthContext, RuntimeEnv } from "../app/context";
import { Context } from "../utils/context";

interface RequestContext {
  auth: AuthContext;
  env: RuntimeEnv;
}

const context = Context.create<RequestContext>("instance");

export const Instance = {
  provide<R>(value: RequestContext, fn: () => R): R {
    return context.provide(value, fn);
  },
  get auth() {
    return context.use().auth;
  },
  get env(): RuntimeEnv {
    return context.use().env;
  },
  get userId(): string {
    const id = context.use().auth.userId;
    if (!id) {
      throw new Error("userId required - ensure requireAuth middleware is applied");
    }
    return id;
  },
};

export type { AppEnv };
