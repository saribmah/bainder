import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChipButton, Icons, Skeleton, Wordmark, color } from "@bainder/ui";
import type { Highlight } from "@bainder/sdk";
import { HIGHLIGHT_COLOR, HIGHLIGHT_LABEL } from "../constants";
import { BottomTabs } from "../../shell";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useLibraryHighlights, type LibraryHighlight } from "../hooks/useLibraryHighlights";
import { libraryStyles as styles } from "../library.styles";

type ColorFilter = Highlight["color"] | "all";

const colorFilters: ColorFilter[] = ["all", "pink", "yellow", "blue", "green", "purple"];

export function HighlightsScreen() {
  const insets = useSafeAreaInsets();
  const { documents, uploadDocument } = useLibraryDocuments();
  const { highlights, error } = useLibraryHighlights(documents);
  const [filter, setFilter] = useState<ColorFilter>("all");

  const visible = useMemo(() => {
    if (!highlights) return null;
    return filter === "all" ? highlights : highlights.filter((item) => item.color === filter);
  }, [filter, highlights]);

  const colorCounts = useMemo(() => {
    const base: Record<Highlight["color"], number> = {
      pink: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      purple: 0,
    };
    for (const item of highlights ?? []) base[item.color] += 1;
    return base;
  }, [highlights]);

  const sourceCount = useMemo(() => {
    const ids = new Set<string>();
    for (const item of highlights ?? []) ids.add(item.documentId);
    return ids.size;
  }, [highlights]);

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
          <Wordmark size="sm" />
          <View style={styles.iconButton}>
            <Icons.Search size={16} color={color.paper[800]} />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>
            {highlights?.length ?? 0} highlights · {sourceCount} sources
          </Text>
          <Text style={styles.title}>Highlights</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {colorFilters.map((item) => (
            <ChipButton
              key={item}
              variant={filter === item ? "active" : "outline"}
              onPress={() => setFilter(item)}
            >
              {item === "all" ? "All" : `${HIGHLIGHT_LABEL[item]} · ${colorCounts[item]}`}
            </ChipButton>
          ))}
        </ScrollView>

        {error && <Text style={styles.error}>{error}</Text>}
        {!visible ? (
          <HighlightsSkeleton />
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No highlights yet</Text>
            <Text style={styles.emptyText}>Marked passages will collect here.</Text>
          </View>
        ) : (
          visible.map((item) => <HighlightItem key={item.id} item={item} />)
        )}
      </ScrollView>

      <BottomTabs active="highlights" bottom={insets.bottom} onUpload={uploadDocument} />
    </View>
  );
}

function HighlightItem({ item }: { item: LibraryHighlight }) {
  return (
    <View style={styles.highlightItem}>
      <View style={styles.highlightMeta}>
        <View style={[styles.highlightDot, { backgroundColor: HIGHLIGHT_COLOR[item.color] }]} />
        <Text style={styles.highlightSource} numberOfLines={1}>
          {item.document.title}
        </Text>
        <Text style={styles.highlightDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.quote, { borderLeftColor: HIGHLIGHT_COLOR[item.color] }]}>
        "{item.textSnippet}"
      </Text>
    </View>
  );
}

function HighlightsSkeleton() {
  return (
    <View>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.highlightItem}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="95%" height={42} />
          <Skeleton width="70%" height={14} />
        </View>
      ))}
    </View>
  );
}
