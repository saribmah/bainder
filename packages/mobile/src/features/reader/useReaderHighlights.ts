import { useCallback, useEffect, useState } from "react";
import type { ApiClient, Highlight, Note } from "@baindar/sdk";
import type { HighlightColor } from "@baindar/ui";

// Highlights and notes live in separate stores: a highlight is the colour
// overlay, a note is free-form text optionally pinned to a highlight via
// `highlightId`. The hook keeps both aligned so the WebView wrapper can
// render the "has-note" indicator and the focused-highlight sheet can show
// (and edit) the attached note.
export type ReaderHighlights = {
  highlights: Highlight[];
  notesByHighlightId: ReadonlyMap<string, Note>;
  reload: () => void;
  create: (
    color: HighlightColor,
    selection: { offsetStart: number; offsetEnd: number; text: string },
    noteBody?: string,
  ) => Promise<Highlight | null>;
  updateColor: (id: string, color: HighlightColor) => Promise<Highlight | null>;
  setNoteForHighlight: (highlightId: string, body: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export function useReaderHighlights({
  client,
  documentId,
  sectionKey,
  enabled,
}: {
  client: ApiClient;
  documentId: string;
  sectionKey: string | null;
  enabled: boolean;
}): ReaderHighlights {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notesByHighlightId, setNotesByHighlightId] = useState<Map<string, Note>>(new Map());
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled || sectionKey === null) {
      setHighlights([]);
      setNotesByHighlightId(new Map());
      return;
    }
    let cancelled = false;
    Promise.all([
      client.highlight.list({ documentId, sectionKey }),
      // Notes attached to a highlight mirror the highlight's sectionKey, so
      // a section-scoped read picks them up alongside section-pinned notes.
      // We only care about highlight-attached ones for the layer map.
      client.note.list({ documentId, sectionKey }),
    ])
      .then(([hl, notes]) => {
        if (cancelled) return;
        setHighlights(hl.data?.items ?? []);
        const map = new Map<string, Note>();
        for (const n of notes.data?.items ?? []) {
          if (n.highlightId !== null) map.set(n.highlightId, n);
        }
        setNotesByHighlightId(map);
      })
      .catch(() => {
        if (cancelled) return;
        setHighlights([]);
        setNotesByHighlightId(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, sectionKey, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const create = useCallback<ReaderHighlights["create"]>(
    async (color, selection, noteBody) => {
      if (sectionKey === null) return null;
      const res = await client.highlight.create({
        documentId,
        sectionKey,
        position: { offsetStart: selection.offsetStart, offsetEnd: selection.offsetEnd },
        textSnippet: selection.text,
        color,
      });
      if (!res.data) return null;
      const created = res.data;
      setHighlights((prev) => [...prev, created]);
      if (noteBody !== undefined && noteBody.length > 0) {
        const noteRes = await client.note.create({
          documentId,
          highlightId: created.id,
          body: noteBody,
        });
        if (noteRes.data) {
          const note = noteRes.data;
          setNotesByHighlightId((prev) => {
            const next = new Map(prev);
            next.set(created.id, note);
            return next;
          });
        }
      }
      return created;
    },
    [client, documentId, sectionKey],
  );

  const updateColor = useCallback<ReaderHighlights["updateColor"]>(
    async (id, color) => {
      const res = await client.highlight.update({ id, color });
      if (res.data) {
        const updated = res.data;
        setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
        return updated;
      }
      return null;
    },
    [client],
  );

  const setNoteForHighlight = useCallback<ReaderHighlights["setNoteForHighlight"]>(
    async (highlightId, body) => {
      const existing = notesByHighlightId.get(highlightId);
      const trimmed = body?.trim() ?? "";

      if (!existing && trimmed.length > 0) {
        const res = await client.note.create({
          documentId,
          highlightId,
          body: trimmed,
        });
        if (res.data) {
          const note = res.data;
          setNotesByHighlightId((prev) => {
            const next = new Map(prev);
            next.set(highlightId, note);
            return next;
          });
        }
        return;
      }

      if (existing && trimmed.length > 0) {
        const res = await client.note.update({ id: existing.id, body: trimmed });
        if (res.data) {
          const note = res.data;
          setNotesByHighlightId((prev) => {
            const next = new Map(prev);
            next.set(highlightId, note);
            return next;
          });
        }
        return;
      }

      if (existing && trimmed.length === 0) {
        await client.note.delete({ id: existing.id });
        setNotesByHighlightId((prev) => {
          const next = new Map(prev);
          next.delete(highlightId);
          return next;
        });
      }
    },
    [client, documentId, notesByHighlightId],
  );

  const remove = useCallback<ReaderHighlights["remove"]>(
    async (id) => {
      // The note FK cascades on the server; mirror that locally so the UI
      // doesn't briefly show an orphaned note.
      await client.highlight.delete({ id });
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setNotesByHighlightId((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [client],
  );

  return {
    highlights,
    notesByHighlightId,
    reload,
    create,
    updateColor,
    setNoteForHighlight,
    remove,
  };
}
