import type { AppEnv, AuthContext, RuntimeEnv } from "../app/context";
import type { Db } from "../db/db";
import { Context } from "../utils/context";

interface RequestContext {
  auth: AuthContext;
  env: RuntimeEnv;
  db: Db;
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
  get db(): Db {
    return context.use().db;
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
