import { useEffect, useState } from "react";
import type { Document, Highlight } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider";

export type LibraryHighlight = Highlight & {
  document: Document;
};

export function useLibraryHighlights(documents: ReadonlyArray<Document> | null) {
  const { client } = useSdk();
  const [items, setItems] = useState<LibraryHighlight[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documents) return;
    const ready = documents.filter((doc) => doc.status === "processed");
    if (ready.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;
    Promise.all(
      ready.map(async (doc) => {
        const res = await client.highlight.list({ documentId: doc.id });
        if (!res.data) return [];
        return res.data.items.map((highlight) => ({ ...highlight, document: doc }));
      }),
    )
      .then((groups) => {
        if (cancelled) return;
        setItems(
          groups
            .flat()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        );
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [client, documents]);

  return { highlights: items, error };
}
