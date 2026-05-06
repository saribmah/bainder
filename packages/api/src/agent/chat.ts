import { createAnthropic } from "@ai-sdk/anthropic";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import type { AuthContext, RuntimeEnv } from "../app/context";
import { Conversation } from "../conversation/conversation";
import { createDb, type Db } from "../db/db";
import { Instance } from "../instance";
import { buildAgentTools } from "./tools";

const SYSTEM_PROMPT = `You are Baindar, an AI assistant that helps users navigate and reason about their personal document binder — receipts, invoices, contracts, manuals, books.

You have tools for inspecting the user's binder:
- listDocuments: enumerate uploads (id, title, kind, status, createdAt).
- listNotes: read the user's notes; optionally scope to one document.
- listHighlights: read the user's highlights; optionally scope to one document.
- runPython: execute Python 3 code in a sandboxed Linux environment. Use this for ad-hoc analysis (math, regex, summarisation, tabulation) over data you have already gathered with the listing tools. Pass data inline as Python literals. The sandbox has Python's standard library and is per-user; the filesystem resets between idle periods, so don't rely on it for state.

Lean on the listing tools before answering specific questions. When the user asks about a document by description ("my lease", "the Apple receipt"), call listDocuments first and match by title. Reach for runPython when the answer requires arithmetic, sorting, or regex over a meaningful number of items — not for trivial work you can do in your head. Keep responses concise and grounded; if a tool result doesn't contain the answer, say so plainly rather than guessing.`;

export class ChatAgent extends AIChatAgent<RuntimeEnv> {
  // Cached after the first D1 lookup. The DO's instance name is the
  // conversationId; the userId is whoever owns that conversation row.
  // Stable for the lifetime of the DO instance — the conversation can't
  // change owners, and the DO is deleted when the conversation is.
  private cachedUserId: string | null = null;

  override async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal },
  ): Promise<Response | undefined> {
    const db = createDb(this.env);
    const userId = await this.resolveUserId(db);
    if (!userId) {
      // The auth middleware blocks unauthorized callers from reaching the
      // DO, so a missing row here implies the conversation was deleted
      // mid-request. Bail without persisting a turn.
      return new Response("Conversation not found", { status: 404 });
    }

    return Instance.provide({ auth: agentAuth(userId), env: this.env, db }, async () => {
      const conversationId = this.name;
      // Bump last_activity_at so the sidebar reorders. Silent no-op if the
      // row vanished mid-turn.
      await Conversation.touch(userId, conversationId).catch(() => {});

      const anthropic = createAnthropic({
        apiKey: this.env.ANTHROPIC_API_KEY,
        baseURL: this.env.ANTHROPIC_BASE_URL || undefined,
      });
      const tools: ToolSet = buildAgentTools({ userId, env: this.env });
      const result = streamText({
        model: anthropic(this.env.ANTHROPIC_MODEL),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(this.messages),
        abortSignal: options?.abortSignal,
        tools,
        // Allow up to 8 model→tool→model loops per turn so the agent can chain
        // (e.g. listDocuments → match by title → listNotes for that document).
        stopWhen: stepCountIs(8),
        onFinish,
      });
      return result.toUIMessageStreamResponse();
    });
  }

  private async resolveUserId(db: Db): Promise<string | null> {
    if (this.cachedUserId) return this.cachedUserId;
    const userId = await Instance.provide({ auth: anonymousAuth, env: this.env, db }, () =>
      Conversation.ownerOf(this.name),
    );
    if (userId) this.cachedUserId = userId;
    return userId;
  }
}

const anonymousAuth: AuthContext = {
  isAuthenticated: false,
  userId: null,
  user: null,
  authMethod: null,
};

const agentAuth = (userId: string): AuthContext => ({
  isAuthenticated: true,
  userId,
  user: null,
  authMethod: "session",
});
