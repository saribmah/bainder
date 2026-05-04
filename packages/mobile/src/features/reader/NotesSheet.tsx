import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { IconButton, Icons, Sheet, color, themeColors, type Theme } from "@baindar/ui";
import type { DocumentSectionSummary, Highlight, Note } from "@baindar/sdk";
import { useSdk } from "../../sdk/sdk.provider.tsx";

export type NotesSheetProps = {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  theme: Theme;
  sections?: ReadonlyArray<DocumentSectionSummary>;
  currentOrder?: number;
  refreshToken: number;
  onJumpToTarget?: (order: number, highlightId?: string | null) => void;
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
  sections,
  currentOrder,
  refreshToken,
  onJumpToTarget,
}: NotesSheetProps) {
  const { client } = useSdk();
  const [items, setItems] = useState<Note[] | null>(null);
  const [highlightsById, setHighlightsById] = useState<Map<string, Highlight>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const sectionInfoByKey = useMemo(() => {
    const map = new Map<string, { order: number; title: string }>();
    if (sections) {
      for (const s of sections) map.set(s.sectionKey, { order: s.order, title: s.title });
    }
    return map;
  }, [sections]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(null);
    Promise.all([client.note.list({ documentId }), client.highlight.list({ documentId })])
      .then(([notes, highlights]) => {
        if (cancelled) return;
        setItems(notes.data?.items ?? []);
        const map = new Map<string, Highlight>();
        for (const h of highlights.data?.items ?? []) map.set(h.id, h);
        setHighlightsById(map);
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
  const muted = palette.fgMuted;
  const cardBg = palette.surfaceRaised;
  const noteBg = noteBgFor(theme);
  const ringColor = palette.borderStrong;

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
            Highlight a passage or jot a thought to start your notebook.
          </Text>
        )}
        {items?.map((n) => {
          const highlight = n.highlightId ? highlightsById.get(n.highlightId) : undefined;
          const sectionKey = n.sectionKey ?? highlight?.sectionKey ?? null;
          const info = sectionKey ? sectionInfoByKey.get(sectionKey) : undefined;
          const positionLabel = labelFor(info, n);
          const isCurrent = info?.order === currentOrder;
          const targetHighlightId = highlight?.id ?? null;
          return (
            <Pressable
              key={n.id}
              onPress={() => {
                if (info) onJumpToTarget?.(info.order, targetHighlightId);
              }}
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
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: highlight
                        ? color.highlight[highlight.color]
                        : palette.borderStrong,
                    },
                  ]}
                />
                <Text style={[styles.metaText, { color: muted }]} numberOfLines={1}>
                  {`${positionLabel} · ${formatRelativeTime(n.createdAt)}`}
                </Text>
              </View>
              {highlight && (
                <Text style={[styles.snippet, { color: palette.text }]} numberOfLines={3}>
                  {`“${highlight.textSnippet}”`}
                </Text>
              )}
              <View style={[styles.noteBox, { backgroundColor: noteBg }]}>
                <Text style={[styles.noteText, { color: palette.text }]} numberOfLines={4}>
                  {n.body}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const labelFor = (info: { order: number; title: string } | undefined, note: Note): string => {
  if (info) return `Ch. ${info.order + 1} · ${info.title}`;
  if (note.highlightId) return "Highlight";
  if (note.sectionKey) return "Section";
  return "Document";
};

function noteBgFor(theme: Theme): string {
  if (theme === "dark") return color.night[700];
  if (theme === "sepia") return color.sepia[50];
  return color.paper[50];
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
