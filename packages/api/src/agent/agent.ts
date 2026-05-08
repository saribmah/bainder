import { Instance } from "../instance";

// Typed accessor for the ChatAgent Durable Object binding. Feature code
// (e.g. Conversation.create / .remove) goes through this instead of reading
// `Instance.env.ChatAgent` directly — same pattern as Config.* and the
// document Processor: only Config / storage / dedicated bindings modules
// touch `Instance.env`.
//
// Identity is `idFromName(\`${userId}:${conversationId}\`)`. The composite
// key removes the global D1 reverse-lookup (Phase 5) — the userId is
// embedded in the DO instance name itself, and the agent persists it in
// its own DO storage on `init()` so resolveUserId() can still answer when
// the DO restarts mid-stream.
export namespace Agent {
  const composeName = (userId: string, conversationId: string): string =>
    `${userId}:${conversationId}`;

  // Persist `(userId, conversationId)` in the chat agent's DO storage. Run
  // once at conversation creation time so subsequent chat turns can read
  // the userId without touching any global lookup table. Idempotent — the
  // ChatAgent's `init` upserts.
  export const init = async (userId: string, conversationId: string): Promise<void> => {
    const stub = stubFor(userId, conversationId);
    await stub.init({ userId, conversationId });
  };

  // Wipe the chat DO's persisted state. Used when a conversation is
  // deleted so the BinderDO row and the DO's storage go away together.
  // Idempotent at the binding level — calling it on a never-activated
  // DO instance is a no-op.
  export const destroy = async (userId: string, conversationId: string): Promise<void> => {
    const stub = stubFor(userId, conversationId);
    await stub.destroy();
  };

  const stubFor = (userId: string, conversationId: string) => {
    const id = Instance.env.ChatAgent.idFromName(composeName(userId, conversationId));
    return Instance.env.ChatAgent.get(id);
  };
}
