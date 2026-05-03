import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChipButton, Icons, Input, Toast, color } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { FILTER_LABEL, type LibraryFilter } from "../constants";
import { LibraryBottomTabs } from "../components/LibraryBottomTabs";
import { LibraryCover } from "../components/LibraryCover";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { libraryStyles as styles } from "../library.styles";
import { progressPercent, sourceLabel, statusLabel } from "../utils/document";

const filters: LibraryFilter[] = ["all", "books", "pdfs", "articles"];

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [searchOpen, setSearchOpen] = useState(false);
  const itemWidth = Math.floor((width - 48 - 28) / 3);
  const {
    documents,
    filteredDocuments,
    counts,
    error,
    uploading,
    toast,
    query,
    setQuery,
    filter,
    setFilter,
    uploadDocument,
  } = useLibraryDocuments();

  const visible = filteredDocuments ?? [];
  return (
    <View style={styles.root}>
      <FlatList
        data={documents === null ? [] : visible}
        keyExtractor={(doc) => doc.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          styles.grid,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.wordmark}>bainder</Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.iconButton}
                  onPress={() => {
                    setSearchOpen((open) => !open);
                    if (searchOpen) setQuery("");
                  }}
                >
                  <Icons.Search size={16} color={color.paper[800]} />
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.iconButton}>
                  <Icons.Filter size={16} color={color.paper[800]} />
                </Pressable>
              </View>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>{counts.all} items</Text>
              <Text style={styles.title}>Library</Text>
            </View>

            {searchOpen && (
              <View style={styles.searchWrap}>
                <Input
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Filter library..."
                  autoFocus
                  iconStart={<Icons.Search size={16} />}
                />
              </View>
            )}

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
                  {FILTER_LABEL[item]} · {counts[item]}
                </ChipButton>
              ))}
            </ScrollView>

            {error && <Text style={styles.error}>{error}</Text>}
            {documents !== null && visible.length === 0 && <EmptyLibrary query={query} />}
          </>
        }
        renderItem={({ item }) => (
          <LibraryGridItem
            doc={item}
            width={itemWidth}
            onPress={() => {
              if (item.status === "processed") router.push(`/library/${item.id}`);
            }}
          />
        )}
      />

      <LibraryBottomTabs active="library" bottom={insets.bottom} onUpload={uploadDocument} />

      {toast && (
        <View style={{ position: "absolute", left: 24, right: 24, bottom: insets.bottom + 78 }}>
          <Toast iconStart={<Icons.Check size={18} color={color.status.success} />}>{toast}</Toast>
        </View>
      )}
    </View>
  );
}

function LibraryGridItem({
  doc,
  width,
  onPress,
}: {
  doc: Document;
  width: number;
  onPress: () => void;
}) {
  const pct = progressPercent(doc);
  const active = doc.status === "processed" && pct > 0 && pct < 100;

  return (
    <View style={[styles.gridItem, { width }]}>
      <Pressable accessibilityRole="button" onPress={onPress} disabled={doc.status !== "processed"}>
        <LibraryCover doc={doc} width={width} height={Math.round(width / 0.66)} />
      </Pressable>
      <Text style={styles.itemTitle} numberOfLines={2}>
        {doc.title}
      </Text>
      <Text style={styles.itemSub} numberOfLines={1}>
        {sourceLabel(doc)} · {statusLabel(doc)}
      </Text>
      {active && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      )}
    </View>
  );
}

function EmptyLibrary({ query }: { query: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{query.trim() ? "No matches" : "No documents yet"}</Text>
      <Text style={styles.emptyText}>
        {query.trim() ? "Try a different title or filename." : "Tap Add to import the first EPUB."}
      </Text>
    </View>
  );
}
