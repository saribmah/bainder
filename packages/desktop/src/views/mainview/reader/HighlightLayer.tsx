import { useEffect, useState, type RefObject } from "react";
import { Button, IconButton, Icons, SelectionToolbar, Sheet, useTheme } from "@bainder/ui";
import { useHighlightLayer, type HighlightColor, type HighlightTarget } from "./useHighlightLayer";

const TOOLBAR_OFFSET_Y = 12;
const TOOLBAR_HEIGHT_ESTIMATE = 44;

export type HighlightLayerProps = {
  containerRef: RefObject<HTMLElement | null>;
  documentId: string;
  target: HighlightTarget | null;
  contentKey: string;
};

export function HighlightLayer({
  containerRef,
  documentId,
  target,
  contentKey,
}: HighlightLayerProps) {
  const layer = useHighlightLayer({
    containerRef,
    documentId,
    target,
    contentKey,
    enabled: target !== null,
  });

  // `noteDraft` is non-null while the user is editing or composing a note.
  // `null` value means "creating from selection", a string id means
  // "editing existing highlight `id`".
  const [noteDraft, setNoteDraft] = useState<{ kind: "new" } | { kind: "edit"; id: string } | null>(
    null,
  );

  if (!target) return null;

  return (
    <>
      {layer.selection && !noteDraft && (
        <SelectionToolbarPositioned
          rect={layer.selection.rect}
          onPickColor={(color) => {
            void layer.create(color);
          }}
          onAddNote={() => setNoteDraft({ kind: "new" })}
        />
      )}

      {layer.focused && !noteDraft && (
        <HighlightPopover
          highlightId={layer.focused.id}
          containerRef={containerRef}
          color={layer.focused.color}
          note={layer.focused.note}
          textSnippet={layer.focused.textSnippet}
          contentKey={contentKey}
          onClose={() => layer.setFocusedId(null)}
          onChangeColor={(color) => {
            void layer.update(layer.focused!.id, { color });
          }}
          onEditNote={() => setNoteDraft({ kind: "edit", id: layer.focused!.id })}
          onDelete={() => {
            void layer.remove(layer.focused!.id);
          }}
        />
      )}

      {noteDraft && (
        <NoteSheet
          initialNote={noteDraft.kind === "edit" ? (layer.focused?.note ?? "") : ""}
          quote={
            noteDraft.kind === "edit"
              ? (layer.focused?.textSnippet ?? "")
              : (layer.selection?.text ?? "")
          }
          onCancel={() => setNoteDraft(null)}
          onSave={async (note) => {
            const trimmed = note.trim();
            if (noteDraft.kind === "new") {
              await layer.create("yellow", trimmed.length > 0 ? trimmed : undefined);
            } else {
              await layer.update(noteDraft.id, {
                note: trimmed.length > 0 ? trimmed : null,
              });
            }
            setNoteDraft(null);
          }}
        />
      )}
    </>
  );
}

function SelectionToolbarPositioned({
  rect,
  onPickColor,
  onAddNote,
}: {
  rect: DOMRect;
  onPickColor: (color: HighlightColor) => void;
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
      <SelectionToolbar onPickColor={onPickColor} onAddNote={onAddNote} />
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

function NoteSheet({
  initialNote,
  quote,
  onCancel,
  onSave,
}: {
  initialNote: string;
  quote: string;
  onCancel: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const backdropBg = theme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(20, 15, 10, 0.35)";
  const inputBg =
    theme === "dark"
      ? "bg-[oklch(15%_0.008_240)] text-night-50 border-[oklch(28%_0.012_240)]"
      : theme === "sepia"
        ? "bg-sepia-50 text-sepia-900 border-sepia-200"
        : "bg-paper-50 text-paper-900 border-paper-200";

  return (
    <div
      role="dialog"
      aria-label="Edit note"
      className="fixed inset-0 z-30 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{ background: backdropBg }}
    >
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-2xl">
        <Sheet>
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="t-label-l">{initialNote ? "Edit note" : "Add note"}</span>
            <IconButton aria-label="Close" size="sm" onClick={onCancel}>
              <Icons.Close size={14} />
            </IconButton>
          </div>

          <p className="t-body-s mt-1 italic opacity-70">"{quote}"</p>

          <textarea
            autoFocus
            className={`t-body-m mt-3 min-h-[140px] w-full rounded-md border px-3 py-2 outline-none ${inputBg}`}
            placeholder="Add a thought…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
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
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
