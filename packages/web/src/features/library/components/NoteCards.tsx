import type { CSSProperties } from "react";
import { Button, Icons } from "@baindar/ui";
import type { Document, Highlight, Note } from "@baindar/sdk";
import { HIGHLIGHT_COLOR } from "../constants";

export type NoteFilter = "all" | "attached" | "standalone";

export type NoteDisplayItem = Note & {
  document?: Document;
  highlight?: Highlight;
};

export function noteMatchesFilter(note: NoteDisplayItem, filter: NoteFilter): boolean {
  if (filter === "attached") return Boolean(note.highlightId);
  if (filter === "standalone") return !note.highlightId;
  return true;
}

export function noteLocationLabel(note: Note, highlight?: Highlight): string {
  const sectionKey = note.sectionKey ?? highlight?.sectionKey ?? null;
  if (!sectionKey) return "Whole book";
  const order = sectionOrderFromKey(sectionKey);
  return order === null ? "Section note" : `Ch. ${order + 1}`;
}

export function noteDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NoteCard({
  note,
  source,
  location,
  dense = false,
  onEdit,
  onOpen,
  onAsk,
}: {
  note: NoteDisplayItem;
  source: string;
  location: string;
  dense?: boolean;
  onEdit?: () => void;
  onOpen?: () => void;
  onAsk?: () => void;
}) {
  const attached = Boolean(note.highlight);
  const accent = note.highlight ? HIGHLIGHT_COLOR[note.highlight.color] : "var(--bd-fg-muted)";

  return (
    <article
      className={[
        "flex flex-col gap-2 border-b border-bd-border",
        dense ? "py-3.5" : "py-[18px]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        {attached ? (
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: accent }} />
        ) : (
          <Icons.Note size={13} color="var(--bd-fg-muted)" />
        )}
        <span className="t-label-m min-w-0 max-w-[48%] truncate text-bd-fg">{source}</span>
        <span className="t-body-s min-w-0 truncate text-[11px] text-bd-fg-muted">· {location}</span>
        <div className="min-w-3 flex-1" />
        {!attached && !dense && (
          <span className="bd-chip h-5 border-0 bg-bd-surface-raised px-2 text-[9px] text-bd-fg-subtle">
            Standalone
          </span>
        )}
      </div>

      {note.highlight && (
        <blockquote
          className={[
            "m-0 border-l-2 pl-3 font-reading leading-[1.55] text-bd-fg",
            dense ? "ml-[18px] text-[13px]" : "ml-[18px] text-[15px]",
          ].join(" ")}
          style={{ borderColor: accent }}
        >
          "{note.highlight.textSnippet}"
        </blockquote>
      )}

      <div
        className={[
          "flex items-start gap-2.5 rounded-xl bg-bd-surface-raised",
          attached ? "ml-[18px]" : "",
          dense ? "px-3 py-2" : "px-3.5 py-3",
        ].join(" ")}
      >
        <Icons.Note size={dense ? 12 : 14} color="var(--bd-fg-subtle)" />
        <p
          className={[
            "m-0 flex-1 font-reading leading-[1.55] text-bd-fg",
            dense ? "text-[13px]" : "text-sm",
          ].join(" ")}
        >
          {note.body}
        </p>
      </div>

      {!dense && (
        <div className={["mt-0.5 flex flex-wrap gap-3", attached ? "ml-[18px]" : ""].join(" ")}>
          {onEdit && (
            <button
              type="button"
              className="border-0 bg-transparent p-0"
              style={noteActionStyle("muted")}
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          {onOpen && (
            <button
              type="button"
              className="border-0 bg-transparent p-0"
              style={noteActionStyle("muted")}
              onClick={onOpen}
            >
              {attached ? "Open in book" : "Attach to passage"}
            </button>
          )}
          {onAsk && (
            <button
              type="button"
              className="border-0 bg-transparent p-0"
              style={noteActionStyle("ask")}
              onClick={onAsk}
            >
              Ask Baindar
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function NoteComposer({
  value,
  disabled,
  placeholder = "A thought about this book...",
  onChange,
  onSubmit,
}: {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl bg-bd-surface-raised px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bd-border">
        <Icons.Note size={14} color="var(--bd-fg-subtle)" />
      </div>
      <div className="min-w-0 flex-1">
        <textarea
          value={value}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none border-0 bg-transparent p-0 font-reading text-[15px] leading-6 text-bd-fg outline-none placeholder:text-bd-fg-muted"
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="bd-chip h-6 border border-bd-border bg-bd-bg text-[11px]">
            <Icons.Bookmark size={10} color="var(--bd-fg-subtle)" />
            Whole book
          </span>
          <span className="t-body-s text-[11px] text-bd-fg-muted">
            or attach to a passage when you're reading
          </span>
          <div className="min-w-3 flex-1" />
          <Button size="sm" disabled={disabled || value.trim().length === 0} onClick={onSubmit}>
            Save note
          </Button>
        </div>
      </div>
    </div>
  );
}

function noteActionStyle(tone: "muted" | "ask"): CSSProperties {
  return {
    color: tone === "ask" ? "var(--bd-accent)" : "var(--bd-fg-muted)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.45,
  };
}

function sectionOrderFromKey(sectionKey: string): number | null {
  const match = /:(\d+)$/.exec(sectionKey);
  if (!match) return null;
  const order = Number(match[1]);
  return Number.isFinite(order) ? order : null;
}
