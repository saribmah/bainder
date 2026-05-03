import { useEffect, useRef, useState } from "react";
import { IconButton, Icons } from "@bainder/ui";
import type { ShelfCustom } from "@bainder/sdk";

export function LibraryActionsMenu({
  onRename,
  onDelete,
  shelves,
  selectedShelfIds,
  workingShelfId,
  onToggleShelf,
  onCreateShelf,
}: {
  onRename?: () => void;
  onDelete?: () => void;
  shelves?: ReadonlyArray<ShelfCustom>;
  selectedShelfIds?: ReadonlySet<string>;
  workingShelfId?: string | null;
  onToggleShelf?: (shelf: ShelfCustom, selected: boolean) => void;
  onCreateShelf?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const showShelves = shelves !== undefined && onToggleShelf !== undefined;

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
          className="absolute right-0 top-full z-20 mt-1 min-w-[260px] overflow-hidden rounded-xl border border-paper-200 bg-paper-50 p-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {showShelves && (
            <>
              <div className="t-label-s px-3 py-2 text-paper-500">Add to shelf</div>
              {shelves.length === 0 ? (
                <div className="px-3 py-2 text-sm text-paper-500">No custom shelves yet.</div>
              ) : (
                shelves.map((shelf) => {
                  const selected = selectedShelfIds?.has(shelf.id) ?? false;
                  return (
                    <button
                      key={shelf.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={selected}
                      disabled={workingShelfId === shelf.id}
                      className={[
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-paper-100 disabled:opacity-50",
                        selected ? "bg-paper-100" : "",
                      ].join(" ")}
                      onClick={() => onToggleShelf(shelf, selected)}
                    >
                      <span
                        className={[
                          "flex h-4 w-4 items-center justify-center rounded-[4px] border",
                          selected
                            ? "border-paper-900 bg-paper-900 text-paper-50"
                            : "border-paper-300 bg-transparent text-transparent",
                        ].join(" ")}
                      >
                        <Icons.Check size={11} color="currentColor" strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-paper-800">{shelf.name}</span>
                      <span className="font-mono text-[10px] text-paper-500">
                        {shelf.itemCount}
                      </span>
                    </button>
                  );
                })
              )}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-wine-700 hover:bg-wine-50"
                onClick={() => {
                  setOpen(false);
                  onCreateShelf?.();
                }}
              >
                <Icons.Plus size={14} color="currentColor" />
                New shelf
              </button>
              <div className="my-1 h-px bg-paper-200" />
            </>
          )}
          {onRename && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-paper-100"
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
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-wine-700 hover:bg-wine-50"
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
