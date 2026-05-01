import { useCallback, useEffect, useState } from "react";
import type { ApiClient, Highlight } from "@bainder/sdk";
import type { HighlightColor } from "@bainder/ui";

export type ReaderHighlights = {
  highlights: Highlight[];
  reload: () => void;
  create: (
    color: HighlightColor,
    selection: { offsetStart: number; offsetEnd: number; text: string },
    note?: string,
  ) => Promise<Highlight | null>;
  update: (
    id: string,
    patch: { color?: HighlightColor; note?: string | null },
  ) => Promise<Highlight | null>;
  remove: (id: string) => Promise<void>;
};

export function useReaderHighlights({
  client,
  documentId,
  chapterOrder,
  enabled,
}: {
  client: ApiClient;
  documentId: string;
  chapterOrder: number | null;
  enabled: boolean;
}): ReaderHighlights {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled || chapterOrder === null) {
      setHighlights([]);
      return;
    }
    let cancelled = false;
    client.highlight
      .list({ documentId, epubChapterOrder: chapterOrder })
      .then((res) => {
        if (cancelled) return;
        setHighlights(res.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setHighlights([]);
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, chapterOrder, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const create = useCallback<ReaderHighlights["create"]>(
    async (color, selection, note) => {
      if (chapterOrder === null) return null;
      const params: Parameters<typeof client.highlight.create>[0] = {
        documentId,
        epubChapterOrder: chapterOrder,
        offsetStart: selection.offsetStart,
        offsetEnd: selection.offsetEnd,
        textSnippet: selection.text,
        color,
      };
      if (note !== undefined) params.note = note;
      const res = await client.highlight.create(params);
      if (res.data) {
        const created = res.data;
        setHighlights((prev) => [...prev, created]);
        return created;
      }
      return null;
    },
    [client, documentId, chapterOrder],
  );

  const update = useCallback<ReaderHighlights["update"]>(
    async (id, patch) => {
      const res = await client.highlight.update({ id, ...patch });
      if (res.data) {
        const updated = res.data;
        setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
        return updated;
      }
      return null;
    },
    [client],
  );

  const remove = useCallback<ReaderHighlights["remove"]>(
    async (id) => {
      await client.highlight.delete({ id });
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    },
    [client],
  );

  return { highlights, reload, create, update, remove };
}
