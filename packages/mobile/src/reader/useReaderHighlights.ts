import { useCallback, useEffect, useState } from "react";
import type { ApiClient, Highlight } from "@bainder/sdk";
import type { HighlightColor } from "@bainder/ui";

export type HighlightTarget =
  | { kind: "epub"; chapterOrder: number }
  | { kind: "pdf"; pageNumber: number };

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
  target,
  enabled,
}: {
  client: ApiClient;
  documentId: string;
  target: HighlightTarget | null;
  enabled: boolean;
}): ReaderHighlights {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled || !target) {
      setHighlights([]);
      return;
    }
    let cancelled = false;
    const query: { documentId: string; epubChapterOrder?: number; pdfPageNumber?: number } = {
      documentId,
    };
    if (target.kind === "epub") query.epubChapterOrder = target.chapterOrder;
    if (target.kind === "pdf") query.pdfPageNumber = target.pageNumber;
    client.highlight
      .list(query)
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
  }, [client, documentId, target, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const create = useCallback<ReaderHighlights["create"]>(
    async (color, selection, note) => {
      if (!target) return null;
      const params: Parameters<typeof client.highlight.create>[0] = {
        documentId,
        offsetStart: selection.offsetStart,
        offsetEnd: selection.offsetEnd,
        textSnippet: selection.text,
        color,
      };
      if (target.kind === "epub") params.epubChapterOrder = target.chapterOrder;
      if (target.kind === "pdf") params.pdfPageNumber = target.pageNumber;
      if (note !== undefined) params.note = note;
      const res = await client.highlight.create(params);
      if (res.data) {
        const created = res.data;
        setHighlights((prev) => [...prev, created]);
        return created;
      }
      return null;
    },
    [client, documentId, target],
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
