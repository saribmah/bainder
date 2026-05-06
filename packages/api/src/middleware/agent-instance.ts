import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app/context";
import { Conversation } from "../conversation/conversation";
import { Instance } from "../instance";

// The agents framework routes by URL: /agents/<class-kebab>/<instance>/...
// requireAuth has already populated Instance.auth.userId; this middleware
// rejects requests where the URL instance segment isn't a conversation
// owned by the authenticated user. Without this, an authed user could open
// a WebSocket against another user's chat DO.
//
// The instance segment IS the conversationId; ChatAgent uses
// idFromName(conversationId), and the conversation row in D1 is the
// authority on ownership.
export const requireOwnAgentInstance: MiddlewareHandler<AppEnv> = async (c, next) => {
  const parts = new URL(c.req.url).pathname.split("/").filter(Boolean);
  const instance = parts[2];
  if (!instance) {
    return c.json({ message: "Bad request" }, 400);
  }

  try {
    await Conversation.get(Instance.userId, instance);
  } catch (error) {
    if (Conversation.NotFoundError.isInstance(error)) {
      return c.json({ message: "Forbidden" }, 403);
    }
    throw error;
  }

  await next();
};
