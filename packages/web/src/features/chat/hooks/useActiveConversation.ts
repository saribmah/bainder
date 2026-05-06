import { useEffect, useState } from "react";
import type { Conversation } from "@baindar/sdk";
import { useSdk } from "../../../sdk";

type State =
  | { status: "loading" }
  | { status: "ready"; conversation: Conversation }
  | { status: "error"; message: string };

// Picks the user's most-recent conversation (or creates one if none exist)
// and surfaces it as the "active" thread for the chat page. PR 2 ships
// single-conversation UX — the sidebar / multi-conversation switcher lands
// in a follow-up.
export function useActiveConversation() {
  const { client } = useSdk();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await client.conversation.list();
        if (cancelled) return;
        if (!list.data) {
          setState({ status: "error", message: "Failed to load conversations" });
          return;
        }
        // List is ordered by lastActivityAt desc server-side.
        const existing = list.data.items[0];
        if (existing) {
          setState({ status: "ready", conversation: existing });
          return;
        }
        const created = await client.conversation.create({});
        if (cancelled) return;
        if (!created.data) {
          setState({ status: "error", message: "Failed to start a conversation" });
          return;
        }
        setState({ status: "ready", conversation: created.data });
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", message: String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return state;
}
