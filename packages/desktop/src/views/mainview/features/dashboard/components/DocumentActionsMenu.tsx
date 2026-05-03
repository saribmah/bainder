import { useEffect, useRef, useState } from "react";
import { IconButton, Icons } from "@bainder/ui";

export function DocumentActionsMenu({
  onRename,
  onDelete,
  compact,
}: {
  onRename?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <IconButton
        aria-label="More actions"
        size={compact ? "sm" : "md"}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icons.MoreVertical size={16} />
      </IconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-bd-border bg-bd-bg shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {onRename && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-bd-surface-hover"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              <Icons.Pencil size={16} />
              Rename
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-bd-accent hover:bg-bd-surface-hover"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Icons.Trash size={16} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
