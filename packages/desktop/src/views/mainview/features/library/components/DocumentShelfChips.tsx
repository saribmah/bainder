import { ChipButton, Icons } from "@bainder/ui";
import type { ShelfCustom } from "@bainder/sdk";

export function DocumentShelfChips({
  shelves,
  selectedShelves,
  workingShelfId,
  onToggle,
  onCreate,
}: {
  shelves: ReadonlyArray<ShelfCustom>;
  selectedShelves: ReadonlyArray<ShelfCustom>;
  workingShelfId: string | null;
  onToggle: (shelf: ShelfCustom, selected: boolean) => void;
  onCreate: () => void;
}) {
  const selectedIds = new Set(selectedShelves.map((shelf) => shelf.id));

  return (
    <section className="rounded-[18px] bg-paper-100 px-5 py-4">
      <div className="t-label-s mb-3 text-paper-500">On shelves · {selectedShelves.length}</div>
      <div className="flex flex-wrap items-center gap-2">
        {shelves.map((shelf) => {
          const selected = selectedIds.has(shelf.id);
          return (
            <ChipButton
              key={shelf.id}
              variant={selected ? "active" : "outline"}
              iconStart={
                selected ? <Icons.Check size={12} strokeWidth={2.5} /> : <Icons.Plus size={12} />
              }
              disabled={workingShelfId === shelf.id}
              onClick={() => onToggle(shelf, selected)}
            >
              {shelf.name}
            </ChipButton>
          );
        })}
        <button
          type="button"
          className="bd-chip border-0 bg-transparent text-wine-700"
          onClick={onCreate}
        >
          <Icons.Plus size={12} color="currentColor" />
          New shelf
        </button>
      </div>
    </section>
  );
}
