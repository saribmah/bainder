import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import {
  Copy as CopyIcon,
  Highlight as HighlightIcon,
  Note as NoteIcon,
  Sparkles as SparklesIcon,
} from "../icons/icons.tsx";
import type { HighlightColor } from "../primitives/Highlight.tsx";
import { cx } from "../utils/cx.ts";

const DEFAULT_COLORS: HighlightColor[] = ["pink", "yellow", "green", "blue", "purple"];

type BaseToolbarProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect">;

export type SelectionToolbarProps =
  | (BaseToolbarProps & {
      variant?: "colors";
      colors?: HighlightColor[];
      onPickColor: (color: HighlightColor) => void;
      onAddNote?: () => void;
      noteLabel?: string;
    })
  | (BaseToolbarProps & {
      variant: "actions";
      onCopy: () => void;
      onHighlight: () => void;
      onAsk: () => void;
      onAddNote: () => void;
      copyLabel?: string;
      highlightLabel?: string;
      askLabel?: string;
      noteLabel?: string;
    });

type ColorSelectionToolbarProps = BaseToolbarProps & {
  colors?: HighlightColor[];
  onPickColor: (color: HighlightColor) => void;
  onAddNote?: () => void;
  noteLabel?: string;
};

export function SelectionToolbar({ className, ...rest }: SelectionToolbarProps) {
  if (rest.variant === "actions") {
    const {
      variant,
      onCopy,
      onHighlight,
      onAsk,
      onAddNote,
      copyLabel = "Copy text",
      highlightLabel = "Highlight",
      askLabel = "Ask Bainder",
      noteLabel = "Add note",
      ...toolbarRest
    } = rest;

    return (
      <ToolbarShell
        aria-label="Selection actions"
        data-toolbar-variant={variant}
        className={cx("bd-selection-toolbar-actions", className)}
        {...toolbarRest}
      >
        <ActionButton aria-label={copyLabel} onClick={onCopy}>
          <CopyIcon size={20} />
        </ActionButton>
        <ActionButton aria-label={highlightLabel} onClick={onHighlight}>
          <HighlightIcon size={20} />
        </ActionButton>
        <ActionButton aria-label={askLabel} onClick={onAsk}>
          <SparklesIcon size={20} />
        </ActionButton>
        <ActionButton aria-label={noteLabel} onClick={onAddNote}>
          <NoteIcon size={20} />
        </ActionButton>
      </ToolbarShell>
    );
  }

  const {
    variant,
    colors = DEFAULT_COLORS,
    onPickColor,
    onAddNote,
    noteLabel = "Add note",
    ...toolbarRest
  } = rest as ColorSelectionToolbarProps & { variant?: "colors" };

  return (
    <ToolbarShell
      aria-label="Annotate selection"
      data-toolbar-variant={variant}
      className={cx("bd-selection-toolbar", className)}
      {...toolbarRest}
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Highlight ${color}`}
          className={cx("bd-color-swatch", `bd-color-swatch-${color}`)}
          onClick={() => onPickColor(color)}
        />
      ))}
      {onAddNote && (
        <>
          <span aria-hidden className="bd-selection-toolbar-divider" />
          <button
            type="button"
            aria-label={noteLabel}
            className="bd-selection-toolbar-btn"
            onClick={onAddNote}
          >
            <NoteIcon size={18} />
          </button>
        </>
      )}
    </ToolbarShell>
  );
}

function ToolbarShell({
  className,
  children,
  ...rest
}: BaseToolbarProps & { children: ReactNode }) {
  return (
    <div
      role="toolbar"
      className={className}
      // mousedown on the toolbar must not steal selection focus from the
      // body while click handlers still need access to the selected range.
      onMouseDown={(event) => event.preventDefault()}
      {...rest}
    >
      {children}
    </div>
  );
}

function ActionButton({
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className="bd-selection-toolbar-btn" {...rest}>
      {children}
    </button>
  );
}
