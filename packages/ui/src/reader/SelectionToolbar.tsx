import type { HTMLAttributes } from "react";
import { Note as NoteIcon } from "../icons/icons.tsx";
import type { HighlightColor } from "../primitives/Highlight.tsx";
import { cx } from "../utils/cx.ts";

const DEFAULT_COLORS: HighlightColor[] = ["pink", "yellow", "green", "blue", "purple"];

export type SelectionToolbarProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "onSelect"
> & {
  colors?: HighlightColor[];
  onPickColor: (color: HighlightColor) => void;
  onAddNote?: () => void;
  noteLabel?: string;
};

export function SelectionToolbar({
  colors = DEFAULT_COLORS,
  onPickColor,
  onAddNote,
  noteLabel = "Add note",
  className,
  ...rest
}: SelectionToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Annotate selection"
      className={cx("bd-selection-toolbar", className)}
      // mousedown on the toolbar must not steal selection focus from the
      // body — preventing default keeps the user's text selection alive
      // long enough for the click handler to read range offsets.
      onMouseDown={(e) => e.preventDefault()}
      {...rest}
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
            className="bd-selection-toolbar-action"
            onClick={onAddNote}
          >
            <NoteIcon size={18} />
          </button>
        </>
      )}
    </div>
  );
}
