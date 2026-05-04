import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  ChipButton,
  Icons,
  Skeleton,
  Toast,
  color,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from "@baindar/ui";
import type { Document, Shelf } from "@baindar/sdk";
import { useSdk } from "../../../sdk/sdk.provider";
import { LibraryCover } from "../components/LibraryCover";
import { AddBooksSheet, CreateShelfSheet, EditShelfSheet } from "../components/ShelfSheets";
import { SpineFan } from "../components/ShelfArtwork";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useLibraryShelves } from "../hooks/useLibraryShelves";
import { buildLibraryStyles, type LibraryStyles } from "../library.styles";
import { progressPercent, sourceLabel, statusLabel } from "../utils/document";
import { shelfDescription, shelfItemNoun } from "../utils/shelf";

type ShelfFilter = "all" | "reading" | "finished";

const filters: ShelfFilter[] = ["all", "reading", "finished"];

export function ShelfDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shelfId = id ? decodeURIComponent(String(id)) : "";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { client } = useSdk();
  const styles = useThemedStyles(buildLibraryStyles);
  const palette = useThemeColors();
  const { documents } = useLibraryDocuments();
  const { shelves, toast, createShelf, updateShelf, deleteShelf, addDocumentToShelf } =
    useLibraryShelves(documents);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [shelfDocuments, setShelfDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShelfFilter>("all");
  const [createShelfOpen, setCreateShelfOpen] = useState(false);
  const [editShelfOpen, setEditShelfOpen] = useState(false);
  const [addBooksOpen, setAddBooksOpen] = useState(false);
  const itemWidth = Math.floor((width - 48 - 28) / 3);

  const refreshShelf = useCallback(async () => {
    if (!shelfId) return;
    try {
      const shelfFromList = shelves?.find((item) => item.id === shelfId) ?? null;
      const [shelfRes, docsRes] = await Promise.all([
        shelfFromList
          ? Promise.resolve({ data: shelfFromList })
          : client.shelf.get({ id: shelfId }),
        client.shelf.listDocuments({ id: shelfId }),
      ]);
      if (!shelfRes.data) throw new Error("Shelf not found");
      if (!docsRes.data) throw new Error("Failed to load shelf documents");
      setShelf(shelfRes.data);
      setShelfDocuments(docsRes.data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [client, shelfId, shelves]);

  useEffect(() => {
    void refreshShelf();
  }, [refreshShelf]);

  const currentIds = useMemo(
    () => new Set((shelfDocuments ?? []).map((doc) => doc.id)),
    [shelfDocuments],
  );
  const visibleDocuments = useMemo(() => {
    if (!shelfDocuments) return null;
    return shelfDocuments.filter((doc) => {
      const pct = progressPercent(doc);
      if (filter === "reading") return pct > 0 && pct < 100;
      if (filter === "finished") return pct >= 100;
      return true;
    });
  }, [filter, shelfDocuments]);
  const filterCounts = useMemo(() => {
    const items = shelfDocuments ?? [];
    return {
      all: items.length,
      reading: items.filter((doc) => {
        const pct = progressPercent(doc);
        return pct > 0 && pct < 100;
      }).length,
      finished: items.filter((doc) => progressPercent(doc) >= 100).length,
    };
  }, [shelfDocuments]);

  const customShelf = shelf?.kind === "custom" ? shelf : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))}
          >
            <Icons.Back size={16} color={palette.fg} />
          </Pressable>
          {customShelf && (
            <Pressable
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={() => setEditShelfOpen(true)}
            >
              <Icons.Settings size={16} color={palette.fg} />
            </Pressable>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {!shelf ? (
          <Skeleton height={220} style={{ marginTop: 20 }} />
        ) : (
          <>
            <ShelfHero
              shelf={shelf}
              styles={styles}
              onAdd={customShelf ? () => setAddBooksOpen(true) : undefined}
              onEdit={customShelf ? () => setEditShelfOpen(true) : undefined}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {filters.map((item) => (
                <ChipButton
                  key={item}
                  variant={filter === item ? "active" : "filled"}
                  onPress={() => setFilter(item)}
                >
                  {item[0].toUpperCase() + item.slice(1)} · {filterCounts[item]}
                </ChipButton>
              ))}
            </ScrollView>

            {visibleDocuments === null ? (
              <ShelfSkeleton styles={styles} />
            ) : visibleDocuments.length === 0 ? (
              <EmptyShelf
                custom={Boolean(customShelf)}
                styles={styles}
                onAdd={() => setAddBooksOpen(true)}
              />
            ) : (
              <View style={styles.shelfGrid}>
                {visibleDocuments.map((doc) => (
                  <ShelfGridItem
                    key={doc.id}
                    doc={doc}
                    width={itemWidth}
                    styles={styles}
                    onPress={() => router.push(`/library/${doc.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {toast && (
        <View style={{ position: "absolute", left: 24, right: 24, bottom: insets.bottom + 78 }}>
          <Toast iconStart={<Icons.Check size={18} color={color.status.success} />}>{toast}</Toast>
        </View>
      )}
      <CreateShelfSheet
        visible={createShelfOpen}
        onClose={() => setCreateShelfOpen(false)}
        onCreate={async (draft) => {
          const created = await createShelf(draft);
          if (created) {
            setCreateShelfOpen(false);
            router.push({ pathname: "/library/shelves/[id]", params: { id: created.id } });
          }
        }}
      />
      <EditShelfSheet
        visible={editShelfOpen}
        shelf={customShelf}
        onClose={() => setEditShelfOpen(false)}
        onSave={async (draft) => {
          if (!customShelf) return;
          const updated = await updateShelf(customShelf, {
            name: draft.name.trim(),
            description: draft.description.trim() ? draft.description.trim() : null,
          });
          if (updated) {
            setShelf(updated);
            setEditShelfOpen(false);
          }
        }}
        onDelete={async () => {
          if (!customShelf) return;
          const deleted = await deleteShelf(customShelf);
          if (deleted) {
            if (router.canGoBack()) router.back();
            else router.replace("/library");
          }
        }}
      />
      <AddBooksSheet
        visible={addBooksOpen}
        shelf={customShelf}
        documents={documents ?? []}
        currentDocumentIds={currentIds}
        onClose={() => setAddBooksOpen(false)}
        onAdd={async (doc) => {
          if (!customShelf) return;
          await addDocumentToShelf(customShelf, doc.id);
          await refreshShelf();
        }}
      />
    </View>
  );
}

function ShelfHero({
  shelf,
  styles,
  onAdd,
  onEdit,
}: {
  shelf: Shelf;
  styles: LibraryStyles;
  onAdd?: () => void;
  onEdit?: () => void;
}) {
  const description = shelfDescription(shelf);

  return (
    <View style={styles.shelfHero}>
      <SpineFan shelf={shelf} size={50} />
      <View style={styles.shelfHeroBody}>
        <Text style={styles.eyebrow}>
          {shelf.kind === "smart" ? "Smart shelf" : "Shelf"} · {shelf.itemCount}{" "}
          {shelfItemNoun(shelf.itemCount)}
        </Text>
        <Text style={styles.shelfTitle}>{shelf.name}.</Text>
        {description && <Text style={styles.shelfDescription}>{description}</Text>}
      </View>
      {(onAdd || onEdit) && (
        <View style={styles.shelfHeroActions}>
          {onAdd && (
            <Button variant="secondary" size="sm" onPress={onAdd}>
              Add books
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onPress={onEdit}>
              Edit
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

function ShelfGridItem({
  doc,
  width,
  styles,
  onPress,
}: {
  doc: Document;
  width: number;
  styles: LibraryStyles;
  onPress: () => void;
}) {
  const pct = progressPercent(doc);
  const finished = pct >= 100;

  return (
    <View style={[styles.gridItem, { width }]}>
      <Pressable accessibilityRole="button" onPress={onPress}>
        <LibraryCover doc={doc} width={width} height={Math.round(width / 0.66)} />
      </Pressable>
      <Text style={styles.itemTitle} numberOfLines={2}>
        {doc.title}
      </Text>
      <Text style={styles.itemSub} numberOfLines={1}>
        {sourceLabel(doc)} · {statusLabel(doc)}
      </Text>
      {pct > 0 && pct < 100 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      )}
      {finished && <Icons.Check size={11} color={color.status.success} />}
    </View>
  );
}

function EmptyShelf({
  custom,
  styles,
  onAdd,
}: {
  custom: boolean;
  styles: LibraryStyles;
  onAdd: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No books here yet</Text>
      <Text style={styles.emptyText}>
        {custom
          ? "Add processed books from your library to build this shelf."
          : "This smart shelf fills itself as you read."}
      </Text>
      {custom && (
        <Button variant="secondary" style={{ marginTop: 14 }} onPress={onAdd}>
          Add books
        </Button>
      )}
    </View>
  );
}

function ShelfSkeleton({ styles }: { styles: LibraryStyles }) {
  return (
    <View style={styles.shelfGrid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} height={160} style={{ flex: 1, minWidth: "30%" }} />
      ))}
    </View>
  );
}
