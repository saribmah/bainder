import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation } from "@baindar/sdk";
import { useSdk } from "../../sdk/sdk.provider.tsx";

export type UseReaderConversationResult = {
  conversation: Conversation | null;
  error: string | null;
  ensure: () => Promise<Conversation | null>;
  reset: () => Promise<Conversation | null>;
};

export function useReaderConversation(
  docId: string,
  docTitle: string,
): UseReaderConversationResult {
  const { client } = useSdk();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const lookupPromiseRef = useRef<Promise<Conversation | null> | null>(null);
  const ensurePromiseRef = useRef<Promise<Conversation | null> | null>(null);

  const setActiveConversation = useCallback((next: Conversation | null) => {
    conversationRef.current = next;
    setConversation(next);
  }, []);

  const findExisting = useCallback(async (): Promise<Conversation | null> => {
    if (lookupPromiseRef.current) return lookupPromiseRef.current;
    const promise = (async () => {
      try {
        const list = await client.conversation.list();
        const match = list.data?.items.find((item) => item.primaryDocId === docId) ?? null;
        if (match) setActiveConversation(match);
        return match;
      } finally {
        lookupPromiseRef.current = null;
      }
    })();
    lookupPromiseRef.current = promise;
    return promise;
  }, [client, docId, setActiveConversation]);

  useEffect(() => {
    let cancelled = false;
    findExisting().catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
    };
  }, [findExisting]);

  const createConversation = useCallback(async (): Promise<Conversation | null> => {
    const created = await client.conversation.create({
      title: docTitle,
      primaryDocId: docId,
    });
    if (!created.data) throw new Error("Could not start a reader conversation");
    setActiveConversation(created.data);
    return created.data;
  }, [client, docId, docTitle, setActiveConversation]);

  const ensure = useCallback(async (): Promise<Conversation | null> => {
    if (conversationRef.current) return conversationRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;
    const promise = (async () => {
      try {
        setError(null);
        const existing = await findExisting();
        if (existing) return existing;
        return await createConversation();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        ensurePromiseRef.current = null;
      }
    })();
    ensurePromiseRef.current = promise;
    return promise;
  }, [createConversation, findExisting]);

  const reset = useCallback(async (): Promise<Conversation | null> => {
    try {
      setError(null);
      return await createConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [createConversation]);

  return { conversation, error, ensure, reset };
}
