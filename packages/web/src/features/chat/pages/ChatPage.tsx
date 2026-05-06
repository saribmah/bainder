import { useState, type FormEvent } from "react";
import { useAgentChat } from "agents/ai-react";
import { useAgent } from "agents/react";
import { useSession } from "../../auth";

const agentsHost = import.meta.env.VITE_AGENTS_HOST || undefined;

export function ChatPage() {
  const session = useSession();
  const userId = session.data?.user?.id;

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bd-bg text-bd-fg-muted">
        <p>Loading session…</p>
      </main>
    );
  }

  return <ChatExperience userId={userId} />;
}

function ChatExperience({ userId }: { userId: string }) {
  const [draft, setDraft] = useState("");

  const agent = useAgent({
    agent: "ChatAgent",
    name: userId,
    host: agentsHost,
  });

  const { messages, sendMessage, status, clearHistory } = useAgentChat({ agent });

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isStreaming) return;
    void sendMessage({ text });
    setDraft("");
  };

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col bg-bd-bg text-bd-fg">
      <header className="flex items-center justify-between border-b border-bd-border px-4 py-3">
        <h1 className="text-base font-semibold">Baindar chat</h1>
        <button
          type="button"
          className="text-xs text-bd-fg-muted hover:text-bd-fg"
          onClick={clearHistory}
        >
          clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-bd-fg-muted">
            Ask anything about your binder. (No tools wired yet — replies are general.)
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  m.role === "user"
                    ? "self-end max-w-[85%] rounded-lg bg-bd-bg-muted px-3 py-2"
                    : "self-start max-w-[85%] rounded-lg border border-bd-border px-3 py-2"
                }
              >
                <p className="text-xs uppercase tracking-wide text-bd-fg-muted">{m.role}</p>
                <div className="mt-1 whitespace-pre-wrap text-sm">
                  {m.parts.map((part, i) =>
                    part.type === "text" ? <span key={i}>{part.text}</span> : null,
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-bd-border p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded border border-bd-border bg-transparent px-3 py-2 text-sm outline-none focus:border-bd-fg-muted"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isStreaming}
          className="rounded border border-bd-border px-4 py-2 text-sm hover:bg-bd-bg-muted disabled:opacity-50"
        >
          {isStreaming ? "…" : "Send"}
        </button>
      </form>
    </main>
  );
}
