import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { IconButton, Icons, Sheet, color, themeColors, type Theme } from "@bainder/ui";
import type { EpubChapterSummary, Highlight } from "@bainder/sdk";
import { useSdk } from "../sdk/sdk.provider.tsx";

export type NotesSheetProps = {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  theme: Theme;
  chapters?: ReadonlyArray<EpubChapterSummary>;
  currentOrder?: number;
  refreshToken: number;
  onJumpEpub?: (chapterOrder: number) => void;
};

type RelativeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

const RELATIVE_THRESHOLDS: Array<[number, RelativeUnit]> = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

const formatRelativeUnit = (value: number, unit: RelativeUnit): string => {
  if (value === 0) return "now";
  const abs = Math.abs(value);
  const label = `${abs} ${unit}${abs === 1 ? "" : "s"}`;
  return value < 0 ? `${label} ago` : `in ${label}`;
};

const formatRelativeTime = (iso: string): string => {
  let value = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [step, unit] of RELATIVE_THRESHOLDS) {
    if (Math.abs(value) < step) return formatRelativeUnit(Math.round(value), unit);
    value /= step;
  }
  return formatRelativeUnit(Math.round(value), "year");
};

export function NotesSheet({
  visible,
  onClose,
  documentId,
  theme,
  chapters,
  currentOrder,
  refreshToken,
  onJumpEpub,
}: NotesSheetProps) {
  const { client } = useSdk();
  const [items, setItems] = useState<Highlight[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titleByOrder = useMemo(() => {
    const map = new Map<number, string>();
    if (chapters) {
      for (const ch of chapters) map.set(ch.order, ch.title);
    }
    return map;
  }, [chapters]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(null);
    client.highlight
      .list({ documentId })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data?.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(String(err));
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, refreshToken, visible]);

  const palette = themeColors(theme);
  const muted = mutedFor(theme);
  const cardBg = cardBgFor(theme);
  const noteBg = noteBgFor(theme);
  const ringColor = ringFor(theme);

  return (
    <Sheet visible={visible} onClose={onClose} style={{ backgroundColor: palette.surface }}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: palette.text }]}>Notes</Text>
          {items && (
            <Text style={[styles.count, { color: muted }]}>
              {items.length === 0
                ? "No notes yet"
                : `${items.length} ${items.length === 1 ? "note" : "notes"}`}
            </Text>
          )}
        </View>
        <IconButton aria-label="Close" size="sm" onPress={onClose}>
          <Icons.Close size={16} color={palette.text} />
        </IconButton>
      </View>

      <ScrollView style={{ maxHeight: 480 }}>
        {error && <Text style={[styles.empty, { color: muted }]}>{error}</Text>}
        {items === null && <Text style={[styles.empty, { color: muted }]}>Loading…</Text>}
        {items && items.length === 0 && !error && (
          <Text style={[styles.empty, { color: muted }]}>
            Highlight a passage to start your notebook.
          </Text>
        )}
        {items?.map((h) => {
          const positionLabel = labelFor(h, titleByOrder);
          const isCurrent = h.epubChapterOrder === currentOrder;
          return (
            <Pressable
              key={h.id}
              onPress={() => onJumpEpub?.(h.epubChapterOrder)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: cardBg },
                isCurrent && { borderColor: ringColor, borderWidth: 1 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.cardMeta}>
                <View
                  accessibilityRole="image"
                  style={[styles.colorDot, { backgroundColor: color.highlight[h.color] }]}
                />
                <Text style={[styles.metaText, { color: muted }]} numberOfLines={1}>
                  {`${positionLabel} · ${formatRelativeTime(h.createdAt)}`}
                </Text>
              </View>
              <Text style={[styles.snippet, { color: palette.text }]} numberOfLines={3}>
                {`“${h.textSnippet}”`}
              </Text>
              {h.note && (
                <View style={[styles.noteBox, { backgroundColor: noteBg }]}>
                  <Text style={[styles.noteText, { color: palette.text }]} numberOfLines={4}>
                    {h.note}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const labelFor = (h: Highlight, titleByOrder: Map<number, string>): string => {
  const title = titleByOrder.get(h.epubChapterOrder);
  return title ? `Ch. ${h.epubChapterOrder + 1} · ${title}` : `Chapter ${h.epubChapterOrder + 1}`;
};

function mutedFor(theme: Theme): string {
  if (theme === "dark") return color.night[200];
  if (theme === "sepia") return color.sepia[700];
  return color.paper[500];
}

function cardBgFor(theme: Theme): string {
  if (theme === "dark") return color.night[800];
  if (theme === "sepia") return color.sepia[100];
  return color.paper[100];
}

function noteBgFor(theme: Theme): string {
  if (theme === "dark") return color.night[700];
  if (theme === "sepia") return color.sepia[50];
  return color.paper[50];
}

function ringFor(theme: Theme): string {
  if (theme === "dark") return color.night[500];
  if (theme === "sepia") return color.sepia[200];
  return color.paper[300];
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: "500" },
  count: { fontSize: 13 },
  empty: { fontSize: 13, paddingVertical: 12 },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 13, flex: 1 },
  snippet: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 19.5,
  },
  noteBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  noteText: { fontSize: 13, lineHeight: 18 },
});
