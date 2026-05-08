import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app/context";
import { Binder } from "../binder/binder";
import { Instance } from "../instance";

// The agents framework routes by URL: /agents/<class-kebab>/<instance>/...
// `instance` is the ChatAgent's composite DO name `${userId}:${conversationId}`.
// requireAuth has already populated Instance.auth.userId; this middleware:
//   1. Parses the composite, rejecting malformed names with 400.
//   2. Rejects requests where the parsed userId doesn't match the auth'd
//      caller (so user A can't open a WebSocket against user B's chat DO).
//   3. Verifies the conversation exists in the caller's BinderDO.
//
// No D1 lookup. The owner check rides off the per-user BinderDO; if the
// conversation doesn't belong to this user it lives in another DO and the
// `getConversation` lookup returns null.
export const requireOwnAgentInstance: MiddlewareHandler<AppEnv> = async (c, next) => {
  const parts = new URL(c.req.url).pathname.split("/").filter(Boolean);
  const instance = parts[2];
  if (!instance) {
    return c.json({ message: "Bad request" }, 400);
  }

  const colon = instance.indexOf(":");
  if (colon <= 0 || colon === instance.length - 1) {
    return c.json({ message: "Bad request" }, 400);
  }
  const urlUserId = instance.slice(0, colon);
  const conversationId = instance.slice(colon + 1);

  if (urlUserId !== Instance.userId) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const conversation = await Binder.require(Instance.userId).getConversation(conversationId);
  if (!conversation) {
    return c.json({ message: "Forbidden" }, 403);
  }

  await next();
};
