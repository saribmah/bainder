import { useCallback, useEffect, useState } from "react";
import type { Document, Note } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider";

export type LibraryNote = Note & {
  document: Document;
};

export function useLibraryNotes(documents: ReadonlyArray<Document> | null) {
  const { client } = useSdk();
  const [items, setItems] = useState<LibraryNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!documents) return;
    const ready = documents.filter((doc) => doc.status === "processed");
    if (ready.length === 0) {
      setItems([]);
      setError(null);
      return;
    }

    const groups = await Promise.all(
      ready.map(async (doc) => {
        const res = await client.note.list({ documentId: doc.id });
        if (!res.data) return [];
        return res.data.items.map((note) => ({ ...note, document: doc }));
      }),
    );
    setItems(
      groups
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
    setError(null);
  }, [client, documents]);

  useEffect(() => {
    if (!documents) return;
    let cancelled = false;
    refresh().catch((err: unknown) => {
      if (!cancelled) setError(String(err));
    });
    return () => {
      cancelled = true;
    };
  }, [documents, refresh]);

  return { notes: items, error, refresh };
}
