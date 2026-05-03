import { ScrollView } from "react-native";
import { ChipButton, Icons, useThemeColors } from "@bainder/ui";
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
  const palette = useThemeColors();
  const selectedIds = new Set(selectedShelves.map((shelf) => shelf.id));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
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
            onPress={() => onToggle(shelf, selected)}
          >
            {shelf.name}
          </ChipButton>
        );
      })}
      <ChipButton
        variant="filled"
        iconStart={<Icons.Plus size={12} color={palette.accent} />}
        onPress={onCreate}
      >
        New shelf
      </ChipButton>
    </ScrollView>
  );
}
