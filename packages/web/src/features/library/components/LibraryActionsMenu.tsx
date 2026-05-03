import { useEffect, useRef, useState } from "react";
import { IconButton, Icons } from "@bainder/ui";

export function LibraryActionsMenu({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
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
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icons.MoreVertical size={15} />
      </IconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-paper-200 bg-paper-50 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-paper-100"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            <Icons.Pencil size={16} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-wine-700 hover:bg-wine-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Icons.Trash size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
