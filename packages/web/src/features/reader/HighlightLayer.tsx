import { useEffect, useState, type RefObject } from "react";
import { Button, IconButton, Icons, SelectionToolbar, Sheet, useTheme } from "@bainder/ui";
import { useProfile } from "../profile";
import { useHighlightLayer, type HighlightColor } from "./useHighlightLayer";

const TOOLBAR_OFFSET_Y = 12;
const TOOLBAR_HEIGHT_ESTIMATE = 58;
const NOTE_POPOVER_WIDTH = 360;
const NOTE_POPOVER_GAP = 14;

export type HighlightLayerProps = {
  containerRef: RefObject<HTMLElement | null>;
  documentId: string;
  sectionKey: string | null;
  contentKey: string;
  onAskSelection?: (quote: string) => void;
};

export function HighlightLayer({
  containerRef,
  documentId,
  sectionKey,
  contentKey,
  onAskSelection,
}: HighlightLayerProps) {
  const layer = useHighlightLayer({
    containerRef,
    documentId,
    sectionKey,
    contentKey,
    enabled: sectionKey !== null,
  });
  const { profile } = useProfile();
  const defaultColor: HighlightColor = profile?.defaultHighlightColor ?? "pink";

  const [noteDraft, setNoteDraft] = useState<{
    id: string;
    quote: string;
    anchorRect?: DOMRect;
  } | null>(null);

  const handleCopySelection = () => {
    const text = layer.selection?.text;
    if (!text) return;
    void copyText(text).finally(layer.clearSelection);
  };

  const handleHighlightSelection = () => {
    void layer.create(defaultColor);
  };

  const handleAskSelection = () => {
    const text = layer.selection?.text;
    if (!text) return;
    onAskSelection?.(text);
    layer.clearSelection();
  };

  const handleAddNoteFromSelection = () => {
    const activeSelection = layer.selection;
    if (!activeSelection) return;
    void layer.create(defaultColor).then((created) => {
      if (!created) return;
      setNoteDraft({
        id: created.id,
        quote: created.textSnippet,
        anchorRect: activeSelection.rect,
      });
    });
  };

  if (sectionKey === null) return null;

  return (
    <>
      {layer.selection && !noteDraft && (
        <SelectionToolbarPositioned
          rect={layer.selection.rect}
          onCopy={handleCopySelection}
          onHighlight={handleHighlightSelection}
          onAsk={handleAskSelection}
          onAddNote={handleAddNoteFromSelection}
        />
      )}

      {layer.focused && !noteDraft && (
        <HighlightPopover
          highlightId={layer.focused.id}
          containerRef={containerRef}
          color={layer.focused.color}
          note={layer.getNoteForHighlight(layer.focused.id)?.body ?? null}
          textSnippet={layer.focused.textSnippet}
          contentKey={contentKey}
          onClose={() => layer.setFocusedId(null)}
          onChangeColor={(color) => {
            void layer.updateColor(layer.focused!.id, color);
          }}
          onEditNote={() =>
            setNoteDraft({
              id: layer.focused!.id,
              quote: layer.focused!.textSnippet,
            })
          }
          onDelete={() => {
            void layer.remove(layer.focused!.id);
          }}
        />
      )}

      {noteDraft && (
        <NotePopover
          highlightId={noteDraft.id}
          containerRef={containerRef}
          contentKey={contentKey}
          anchorRect={noteDraft.anchorRect}
          initialNote={layer.getNoteForHighlight(noteDraft.id)?.body ?? ""}
          quote={noteDraft.quote}
          onCancel={() => setNoteDraft(null)}
          onAsk={() => {
            onAskSelection?.(noteDraft.quote);
            setNoteDraft(null);
          }}
          onSave={async (note) => {
            const trimmed = note.trim();
            await layer.setNoteForHighlight(noteDraft.id, trimmed.length > 0 ? trimmed : null);
            setNoteDraft(null);
          }}
        />
      )}
    </>
  );
}

function SelectionToolbarPositioned({
  rect,
  onCopy,
  onHighlight,
  onAsk,
  onAddNote,
}: {
  rect: DOMRect;
  onCopy: () => void;
  onHighlight: () => void;
  onAsk: () => void;
  onAddNote: () => void;
}) {
  // Prefer above the selection; if there's no room, fall back to below.
  const above = rect.top - TOOLBAR_OFFSET_Y - TOOLBAR_HEIGHT_ESTIMATE >= 8;
  const top = above
    ? rect.top - TOOLBAR_OFFSET_Y - TOOLBAR_HEIGHT_ESTIMATE
    : rect.bottom + TOOLBAR_OFFSET_Y;
  const left = Math.max(8, Math.min(window.innerWidth - 8, rect.left + rect.width / 2));

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateX(-50%)",
        zIndex: 30,
      }}
    >
      <SelectionToolbar
        variant="actions"
        onCopy={onCopy}
        onHighlight={onHighlight}
        onAsk={onAsk}
        onAddNote={onAddNote}
      />
    </div>
  );
}

function HighlightPopover({
  highlightId,
  containerRef,
  color,
  note,
  textSnippet,
  contentKey,
  onClose,
  onChangeColor,
  onEditNote,
  onDelete,
}: {
  highlightId: string;
  containerRef: RefObject<HTMLElement | null>;
  color: HighlightColor;
  note: string | null;
  textSnippet: string;
  contentKey: string;
  onClose: () => void;
  onChangeColor: (color: HighlightColor) => void;
  onEditNote: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Look up the mark in the live DOM. Re-run on contentKey so a chapter
  // switch (which invalidates DOM marks) drops the popover.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setRect(null);
      return;
    }
    const mark = container.querySelector<HTMLElement>(`mark[data-highlight-id="${highlightId}"]`);
    if (!mark) {
      setRect(null);
      onClose();
      return;
    }
    setRect(mark.getBoundingClientRect());
  }, [highlightId, containerRef, contentKey, onClose]);

  // Close on outside click and on escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-highlight-popover]")) return;
      if (t.closest(`mark[data-highlight-id="${highlightId}"]`)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [highlightId, onClose]);

  if (!rect) return null;
  const top = rect.bottom + 8;
  const left = Math.max(8, Math.min(window.innerWidth - 8, rect.left + rect.width / 2));

  const noteBg =
    theme === "dark"
      ? "bg-[oklch(15%_0.008_240)] text-night-50"
      : theme === "sepia"
        ? "bg-sepia-100 text-sepia-900"
        : "bg-paper-100 text-paper-900";

  return (
    <div
      data-highlight-popover
      role="dialog"
      aria-label="Highlight options"
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateX(-50%)",
        zIndex: 30,
        width: "min(360px, calc(100vw - 16px))",
      }}
    >
      <Sheet showHandle={false}>
        <div className="flex items-start gap-2">
          <p className="t-body-s line-clamp-3 flex-1 italic opacity-80">"{textSnippet}"</p>
          <IconButton aria-label="Close" size="sm" onClick={onClose}>
            <Icons.Close size={14} />
          </IconButton>
        </div>

        {note && (
          <p className={`t-body-m mt-2 rounded-md p-3 ${noteBg} whitespace-pre-wrap`}>{note}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <SelectionToolbar
            colors={["pink", "yellow", "green", "blue", "purple"]}
            onPickColor={onChangeColor}
            aria-label={`Change color (current: ${color})`}
          />
          <div className="flex items-center gap-1">
            <IconButton aria-label={note ? "Edit note" : "Add note"} size="sm" onClick={onEditNote}>
              <Icons.Note size={16} />
            </IconButton>
            <IconButton aria-label="Delete highlight" size="sm" onClick={onDelete}>
              <Icons.Close size={16} />
            </IconButton>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function NotePopover({
  highlightId,
  containerRef,
  contentKey,
  anchorRect,
  initialNote,
  quote,
  onCancel,
  onAsk,
  onSave,
}: {
  highlightId: string;
  containerRef: RefObject<HTMLElement | null>;
  contentKey: string;
  anchorRect?: DOMRect;
  initialNote: string;
  quote: string;
  onCancel: () => void;
  onAsk: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();
  const [rect, setRect] = useState<DOMRect | null>(anchorRect ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    const onDoc = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-note-popover]")) return;
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [onCancel]);

  useEffect(() => {
    const container = containerRef.current;
    const mark = container?.querySelector<HTMLElement>(`mark[data-highlight-id="${highlightId}"]`);
    if (mark) setRect(mark.getBoundingClientRect());
  }, [highlightId, containerRef, contentKey]);

  const inputBg =
    theme === "dark"
      ? "bg-[oklch(15%_0.008_240)] text-night-50 border-[oklch(28%_0.012_240)]"
      : theme === "sepia"
        ? "bg-sepia-50 text-sepia-900 border-sepia-200"
        : "bg-paper-50 text-paper-900 border-paper-200";

  const surface =
    theme === "dark"
      ? "var(--night-800)"
      : theme === "sepia"
        ? "var(--sepia-50)"
        : "var(--paper-50)";
  const border =
    theme === "dark"
      ? "oklch(30% 0.012 240)"
      : theme === "sepia"
        ? "var(--sepia-200)"
        : "var(--paper-200)";
  const muted =
    theme === "dark"
      ? "var(--night-200)"
      : theme === "sepia"
        ? "var(--sepia-700)"
        : "var(--paper-500)";
  const raised =
    theme === "dark"
      ? "oklch(15% 0.008 240)"
      : theme === "sepia"
        ? "var(--sepia-100)"
        : "var(--paper-100)";
  const position = rect ? notePopoverPosition(rect) : null;

  if (!position) return null;

  return (
    <div
      data-note-popover
      role="dialog"
      aria-label="Edit note"
      className="fixed z-30"
      style={{
        top: position.top,
        left: position.left,
        transform: position.transform,
        width: "min(360px, calc(100vw - 16px))",
      }}
    >
      <div
        className="flex flex-col gap-3 rounded-[18px] border p-5"
        style={{
          background: surface,
          borderColor: border,
          boxShadow: "0 24px 48px rgba(20,15,10,0.20), 0 4px 12px rgba(20,15,10,0.10)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-full p-[3px]" style={{ background: raised }}>
            <span
              className="font-ui rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{ background: surface, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
            >
              On highlight
            </span>
            <span
              className="font-ui px-3 py-1.5 text-[11px] font-semibold"
              style={{ color: muted }}
            >
              Standalone
            </span>
          </div>
          <div className="flex-1" />
          <IconButton aria-label="Close" size="sm" onClick={onCancel}>
            <Icons.Close size={12} />
          </IconButton>
        </div>

        <blockquote
          className="m-0 border-l-2 pl-3 font-reading text-[13px] leading-normal italic"
          style={{ borderColor: "var(--hl-pink)", color: "var(--bd-fg-subtle)" }}
        >
          "{quote}"
        </blockquote>

        <textarea
          autoFocus
          className={`t-body-m min-h-20 w-full resize-none rounded-[12px] border px-3 py-2 font-reading leading-relaxed outline-none ${inputBg}`}
          placeholder="What did you think?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <button
          type="button"
          className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left"
          style={{ background: raised, color: "var(--bd-accent)" }}
          onClick={onAsk}
        >
          <Icons.Sparkles size={13} />
          <span className="t-body-s font-semibold">Ask Bainder about this passage instead</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="t-body-s text-[11px]" style={{ color: muted }}>
            On highlight
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(value);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save note"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function notePopoverPosition(rect: DOMRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(NOTE_POPOVER_WIDTH, viewportWidth - 16);
  const top = Math.max(8, Math.min(rect.top - 20, viewportHeight - 280));

  if (rect.right + NOTE_POPOVER_GAP + width <= viewportWidth - 8) {
    return { top, left: rect.right + NOTE_POPOVER_GAP, transform: "none" };
  }

  if (rect.left - NOTE_POPOVER_GAP - width >= 8) {
    return { top, left: rect.left - NOTE_POPOVER_GAP - width, transform: "none" };
  }

  const centeredLeft = Math.max(
    width / 2 + 8,
    Math.min(viewportWidth - width / 2 - 8, rect.left + rect.width / 2),
  );
  return {
    top: Math.max(8, Math.min(rect.bottom + NOTE_POPOVER_GAP, viewportHeight - 280)),
    left: centeredLeft,
    transform: "translateX(-50%)",
  };
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy copy path for restricted browser contexts.
    }
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
