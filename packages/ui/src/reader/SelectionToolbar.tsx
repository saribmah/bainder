import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Copy as CopyIcon, Note as NoteIcon, Sparkles as SparklesIcon } from "../icons/icons.tsx";
import type { HighlightColor } from "../primitives/Highlight.tsx";
import { cx } from "../utils/cx.ts";

const DEFAULT_COLORS: HighlightColor[] = ["pink", "yellow", "green", "blue", "purple"];

type BaseToolbarProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect">;

type ActionSelectionToolbarProps = BaseToolbarProps & {
  variant: "actions";
  onCopy: () => void;
  onHighlight: () => void;
  onAsk: () => void;
  onAddNote: () => void;
  activeColor?: HighlightColor;
  colors?: HighlightColor[];
  onPickColor?: (color: HighlightColor) => void;
  copyLabel?: string;
  highlightLabel?: string;
  askLabel?: string;
  noteLabel?: string;
};

export type SelectionToolbarProps =
  | (BaseToolbarProps & {
      variant?: "colors";
      colors?: HighlightColor[];
      onPickColor: (color: HighlightColor) => void;
      onAddNote?: () => void;
      noteLabel?: string;
    })
  | ActionSelectionToolbarProps;

type ColorSelectionToolbarProps = BaseToolbarProps & {
  colors?: HighlightColor[];
  onPickColor: (color: HighlightColor) => void;
  onAddNote?: () => void;
  noteLabel?: string;
};

export function SelectionToolbar({ className, ...rest }: SelectionToolbarProps) {
  if (rest.variant === "actions") {
    return <SelectionActionsToolbar {...rest} className={className} />;
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

function SelectionActionsToolbar({
  className,
  variant,
  onCopy,
  onHighlight,
  onAsk,
  onAddNote,
  activeColor = "pink",
  colors = DEFAULT_COLORS,
  onPickColor,
  copyLabel = "Copy text",
  highlightLabel = "Highlight",
  askLabel = "Ask Bainder",
  noteLabel = "Add note",
  ...toolbarRest
}: ActionSelectionToolbarProps & { className?: string }) {
  const [colorTrayOpen, setColorTrayOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);
  const hasColorTray = onPickColor !== undefined;

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  useEffect(
    () => () => {
      if (longPressTimerRef.current === null) return;
      window.clearTimeout(longPressTimerRef.current);
    },
    [],
  );

  const handleHighlightPointerDown = () => {
    if (!hasColorTray) return;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
      setColorTrayOpen(true);
      longPressTimerRef.current = null;
    }, 450);
  };

  const handleHighlightPointerEnd = () => {
    clearLongPressTimer();
  };

  const handleHighlightClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressNextClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClickRef.current = false;
      return;
    }

    const target = event.target;
    if (
      hasColorTray &&
      target instanceof Element &&
      target.closest("[data-selection-toolbar-active-dot]")
    ) {
      event.preventDefault();
      event.stopPropagation();
      setColorTrayOpen((open) => !open);
      return;
    }

    setColorTrayOpen(false);
    onHighlight();
  };

  const handlePickColor = (color: HighlightColor) => {
    setColorTrayOpen(false);
    onPickColor?.(color);
  };

  const toolbar = (
    <ToolbarShell
      aria-label="Selection actions"
      data-toolbar-variant={variant}
      className={cx("bd-selection-toolbar-actions", className)}
      {...toolbarRest}
    >
      <ActionButton
        aria-label={highlightLabel}
        aria-expanded={hasColorTray ? colorTrayOpen : undefined}
        className="bd-selection-toolbar-highlight-btn"
        onClick={handleHighlightClick}
        onPointerDown={handleHighlightPointerDown}
        onPointerUp={handleHighlightPointerEnd}
        onPointerLeave={handleHighlightPointerEnd}
        onPointerCancel={handleHighlightPointerEnd}
      >
        <span
          aria-hidden
          data-selection-toolbar-active-dot={hasColorTray ? "" : undefined}
          className={cx("bd-selection-toolbar-active-dot", `bd-color-swatch-${activeColor}`)}
        />
        <span>{highlightLabel}</span>
      </ActionButton>
      <span aria-hidden className="bd-selection-toolbar-divider" />
      <ActionButton aria-label={noteLabel} onClick={onAddNote}>
        <NoteIcon size={18} />
      </ActionButton>
      <ActionButton aria-label={askLabel} onClick={onAsk}>
        <SparklesIcon size={18} className="bd-selection-toolbar-ask-icon" />
      </ActionButton>
      <span aria-hidden className="bd-selection-toolbar-divider" />
      <ActionButton aria-label={copyLabel} onClick={onCopy}>
        <CopyIcon size={17} />
      </ActionButton>
    </ToolbarShell>
  );

  if (!hasColorTray) return toolbar;

  return (
    <div className="bd-selection-toolbar-actions-wrap">
      {colorTrayOpen && (
        <div
          role="toolbar"
          aria-label="Highlight colors"
          className="bd-selection-toolbar-color-tray"
          onMouseDown={(event) => event.preventDefault()}
        >
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Highlight ${color}`}
              aria-pressed={color === activeColor}
              className={cx(
                "bd-selection-toolbar-tray-swatch",
                `bd-color-swatch-${color}`,
                color === activeColor && "bd-selection-toolbar-tray-swatch-active",
              )}
              onClick={() => handlePickColor(color)}
            />
          ))}
        </div>
      )}
      {toolbar}
    </div>
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
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={cx("bd-selection-toolbar-btn", className)} {...rest}>
      {children}
    </button>
  );
}
