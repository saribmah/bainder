import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import type { Highlight } from "@bainder/sdk";
import { useSdk } from "../../sdk";
import { useReaderHighlights } from "./highlightsRefresh";
import {
  charOffsetsToRange,
  rangeToCharOffsets,
  unwrapMarks,
  wrapRangeWithMarks,
  type CharRange,
} from "./textOffsets";

export type HighlightColor = Highlight["color"];

export type ActiveSelection = {
  rect: DOMRect;
  charRange: CharRange;
  text: string;
};

const HIGHLIGHT_MARK_SELECTOR = "mark[data-highlight-id]";
const MAX_SNIPPET = 4_000;

const colorClass = (color: HighlightColor): string =>
  color === "pink" ? "bd-highlight" : `bd-highlight bd-highlight-${color}`;

// Wraps stored highlights, listens for user selection inside `containerRef`,
// and exposes CRUD that persists via `client.highlight.*`.
//
// `contentKey` should change whenever the body's inner HTML/text is replaced
// (chapter switch). The wrap effect re-runs and re-applies marks for the
// new content.
export function useHighlightLayer({
  containerRef,
  documentId,
  chapterOrder,
  contentKey,
  enabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  documentId: string;
  chapterOrder: number | null;
  contentKey: string;
  enabled: boolean;
}) {
  const { client } = useSdk();
  const refresh = useReaderHighlights();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selection, setSelection] = useState<ActiveSelection | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // ---- Fetch on chapter change --------------------------------------------
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
        if (cancelled) return;
        setHighlights([]);
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, chapterOrder, enabled]);

  // ---- Selection tracking --------------------------------------------------
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      const sel = window.getSelection();
      const container = containerRef.current;
      if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // Both ends must live inside the body container, otherwise the offsets
      // wouldn't be meaningful against `chapter.html`.
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        setSelection(null);
        return;
      }
      // Ignore selections that begin or end inside an existing highlight —
      // those are clicks/double-clicks on the mark, handled separately.
      const startEl =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      if (startEl?.closest(HIGHLIGHT_MARK_SELECTOR)) {
        setSelection(null);
        return;
      }

      const text = range.toString();
      if (!text.trim()) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const charRange = rangeToCharOffsets(container, range);
      setSelection({ rect, charRange, text: text.slice(0, MAX_SNIPPET) });
    };

    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [containerRef, enabled]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  // ---- Apply marks to the rendered body ------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    unwrapMarks(container, HIGHLIGHT_MARK_SELECTOR);
    if (!enabled || highlights.length === 0) return;

    // Sort by (start, -length) so longer ranges wrap first; otherwise a
    // shorter inner highlight could split the longer one's text node and
    // confuse the next pass. Wrapping in offset order is robust because
    // each pass operates on the freshly-normalised tree.
    const ordered = [...highlights].sort((a, b) => {
      if (a.offsetStart !== b.offsetStart) return a.offsetStart - b.offsetStart;
      return b.offsetEnd - b.offsetStart - (a.offsetEnd - a.offsetStart);
    });

    for (const h of ordered) {
      const range = charOffsetsToRange(container, h.offsetStart, h.offsetEnd);
      if (!range) continue;
      wrapRangeWithMarks(range, {
        className: colorClass(h.color),
        attributes: {
          "data-highlight-id": h.id,
          ...(h.note ? { "data-highlight-has-note": "true" } : null),
        },
      });
    }
  }, [highlights, contentKey, containerRef, enabled]);

  // ---- Click delegation for opening an existing highlight ------------------
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const mark = target.closest<HTMLElement>(HIGHLIGHT_MARK_SELECTOR);
      if (!mark) return;
      const id = mark.dataset.highlightId;
      if (id) setFocusedId(id);
    };
    container.addEventListener("click", handler);
    return () => container.removeEventListener("click", handler);
  }, [containerRef, enabled, contentKey]);

  // ---- CRUD ----------------------------------------------------------------
  const create = useCallback(
    async (color: HighlightColor, note?: string) => {
      if (chapterOrder === null || !selection) return;
      const params: Parameters<typeof client.highlight.create>[0] = {
        documentId,
        epubChapterOrder: chapterOrder,
        offsetStart: selection.charRange.start,
        offsetEnd: selection.charRange.end,
        textSnippet: selection.text,
        color,
      };
      if (note !== undefined) params.note = note;

      const res = await client.highlight.create(params);
      if (res.data) {
        const created = res.data;
        setHighlights((prev) => [...prev, created]);
        if (note !== undefined) setFocusedId(created.id);
        refresh?.bumpRefresh();
      }
      clearSelection();
    },
    [client, documentId, chapterOrder, selection, clearSelection, refresh],
  );

  const update = useCallback(
    async (id: string, patch: { color?: HighlightColor; note?: string | null }) => {
      const res = await client.highlight.update({ id, ...patch });
      if (res.data) {
        const updated = res.data;
        setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
        refresh?.bumpRefresh();
      }
    },
    [client, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await client.highlight.delete({ id });
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setFocusedId((curr) => (curr === id ? null : curr));
      refresh?.bumpRefresh();
    },
    [client, refresh],
  );

  const focused = useMemo(
    () => highlights.find((h) => h.id === focusedId) ?? null,
    [highlights, focusedId],
  );

  return {
    highlights,
    selection,
    clearSelection,
    create,
    update,
    remove,
    focused,
    setFocusedId,
  };
}
