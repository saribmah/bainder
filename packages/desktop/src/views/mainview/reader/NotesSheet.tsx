import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Icons, Sheet, useTheme } from "@bainder/ui";
import type { EpubChapterSummary, Highlight } from "@bainder/sdk";
import { useSdk } from "../sdk";

export type NotesSheetProps = {
  documentId: string;
  documentKind: "epub" | "pdf";
  chapters?: ReadonlyArray<EpubChapterSummary>;
  currentOrder?: number;
  currentPage?: number;
  refreshToken: number;
  onJumpEpub?: (chapterOrder: number) => void;
  onJumpPdf?: (pageNumber: number) => void;
  onClose: () => void;
};

const RELATIVE_THRESHOLDS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

const formatRelativeTime = (iso: string): string => {
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMs = new Date(iso).getTime() - Date.now();
  let value = diffMs / 1000;
  for (const [step, unit] of RELATIVE_THRESHOLDS) {
    if (Math.abs(value) < step) return fmt.format(Math.round(value), unit);
    value /= step;
  }
  return fmt.format(Math.round(value), "year");
};

export function NotesSheet({
  documentId,
  documentKind,
  chapters,
  currentOrder,
  currentPage,
  refreshToken,
  onJumpEpub,
  onJumpPdf,
  onClose,
}: NotesSheetProps) {
  const { client } = useSdk();
  const { theme } = useTheme();
  const [items, setItems] = useState<Highlight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Map chapter order → title for EPUB nav labels.
  const titleByOrder = useMemo(() => {
    const map = new Map<number, string>();
    if (chapters) {
      for (const ch of chapters) map.set(ch.order, ch.title);
    }
    return map;
  }, [chapters]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    client.highlight
      .list({ documentId })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data?.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(String(err));
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, refreshToken]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  const backdropBg = theme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(20, 15, 10, 0.35)";

  const cardBg =
    theme === "dark"
      ? "bg-[oklch(15%_0.008_240)]"
      : theme === "sepia"
        ? "bg-sepia-100"
        : "bg-paper-100";
  const noteBg =
    theme === "dark"
      ? "bg-[oklch(20%_0.010_240)]"
      : theme === "sepia"
        ? "bg-sepia-50"
        : "bg-paper-50";
  const mutedColor =
    theme === "dark" ? "text-night-200" : theme === "sepia" ? "text-sepia-700" : "text-paper-500";
  const bodyColor =
    theme === "dark" ? "text-night-50" : theme === "sepia" ? "text-sepia-900" : "text-paper-800";
  const activeRing =
    theme === "dark"
      ? "ring-1 ring-[oklch(40%_0.012_240)]"
      : theme === "sepia"
        ? "ring-1 ring-sepia-300"
        : "ring-1 ring-paper-300";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notes"
      className="fixed inset-0 z-20 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ background: backdropBg }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-2xl outline-none"
      >
        <Sheet style={{ maxHeight: "70vh" }}>
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <div className="flex items-baseline gap-2">
              <span className="t-label-l">Notes</span>
              {items && (
                <span className={`t-body-s ${mutedColor}`}>
                  {items.length === 0
                    ? "No notes yet"
                    : `${items.length} ${items.length === 1 ? "note" : "notes"}`}
                </span>
              )}
            </div>
            <IconButton aria-label="Close" size="sm" onClick={onClose}>
              <Icons.Close size={16} />
            </IconButton>
          </div>

          <ul className="flex-1 overflow-y-auto" style={{ marginRight: -8, paddingRight: 8 }}>
            {error && <li className={`t-body-s mt-2 ${mutedColor}`}>{error}</li>}
            {items === null && <li className={`t-body-s mt-4 ${mutedColor}`}>Loading…</li>}
            {items && items.length === 0 && !error && (
              <li className={`t-body-s mt-4 ${mutedColor}`}>
                Highlight a passage to start your notebook.
              </li>
            )}
            {items?.map((h) => {
              const positionLabel = labelFor(h, documentKind, titleByOrder);
              const isCurrent =
                (documentKind === "epub" && h.epubChapterOrder === currentOrder) ||
                (documentKind === "pdf" && h.pdfPageNumber === currentPage);
              return (
                <li key={h.id} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (documentKind === "epub" && h.epubChapterOrder !== null) {
                        onJumpEpub?.(h.epubChapterOrder);
                      } else if (documentKind === "pdf" && h.pdfPageNumber !== null) {
                        onJumpPdf?.(h.pdfPageNumber);
                      }
                    }}
                    className={`block w-full rounded-xl p-3 text-left transition-colors ${cardBg} ${
                      isCurrent ? activeRing : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: `var(--hl-${h.color})` }}
                      />
                      <span className={`t-body-s ${mutedColor}`}>
                        {positionLabel} · {formatRelativeTime(h.createdAt)}
                      </span>
                    </div>
                    <p
                      className={`mt-2 line-clamp-3 italic ${bodyColor}`}
                      style={{ fontFamily: "var(--font-reading)", fontSize: 13, lineHeight: 1.5 }}
                    >
                      "{h.textSnippet}"
                    </p>
                    {h.note && (
                      <p
                        className={`t-body-s mt-2 line-clamp-4 rounded-md p-2 ${noteBg} ${bodyColor}`}
                      >
                        {h.note}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      </div>
    </div>
  );
}

const labelFor = (
  h: Highlight,
  kind: "epub" | "pdf",
  titleByOrder: Map<number, string>,
): string => {
  if (kind === "epub" && h.epubChapterOrder !== null) {
    const title = titleByOrder.get(h.epubChapterOrder);
    return title ? `Ch. ${h.epubChapterOrder + 1} · ${title}` : `Chapter ${h.epubChapterOrder + 1}`;
  }
  if (kind === "pdf" && h.pdfPageNumber !== null) {
    return `Page ${h.pdfPageNumber}`;
  }
  return "—";
};
