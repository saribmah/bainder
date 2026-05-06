import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app/context";
import { Instance } from "../instance";

// The agents framework routes by URL: /agents/<class-kebab>/<instance>/...
// requireAuth has already populated Instance.auth.userId; this middleware
// rejects requests where the URL instance segment doesn't match the
// authenticated user's id, so an authed user can't open a WebSocket against
// another user's per-user agent (e.g. their chat history).
export const requireOwnAgentInstance: MiddlewareHandler<AppEnv> = async (c, next) => {
  const parts = new URL(c.req.url).pathname.split("/").filter(Boolean);
  const instance = parts[2];
  if (!instance) {
    return c.json({ message: "Bad request" }, 400);
  }
  if (instance !== Instance.auth.userId) {
    return c.json({ message: "Forbidden" }, 403);
  }
  await next();
};
