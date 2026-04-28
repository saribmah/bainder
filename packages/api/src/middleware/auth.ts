import type { MiddlewareHandler } from "hono";
import type { AppEnv, AuthContext } from "../app/context";
import { Instance } from "../instance";

export const createAnonymousAuth = (): AuthContext => ({
  isAuthenticated: false,
  userId: null,
  user: null,
  authMethod: null,
});

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!Instance.auth.isAuthenticated || !Instance.auth.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  await next();
};
