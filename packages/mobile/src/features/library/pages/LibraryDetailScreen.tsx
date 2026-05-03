import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Chip,
  ChipButton,
  Icons,
  Skeleton,
  color,
  font,
  radius,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from "@bainder/ui";
import type { Document, DocumentManifest, Highlight, Note } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider";
import { HIGHLIGHT_COLOR, KIND_LABEL } from "../constants";
import { DocumentShelfChips } from "../components/DocumentShelfChips";
import { LibraryCover } from "../components/LibraryCover";
import { CreateShelfSheet } from "../components/ShelfSheets";
import { useLibraryShelves } from "../hooks/useLibraryShelves";
import { buildLibraryStyles, type LibraryStyles } from "../library.styles";
import {
  estimateMinutes,
  formatWordCount,
  progressPercent,
  sectionOrderFromKey,
  sourceLabel,
} from "../utils/document";

type DetailTab = "contents" | "notes" | "about";
type NoteFilter = "all" | "attached" | "standalone";

export function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { client } = useSdk();
  const styles = useThemedStyles(buildLibraryStyles);
  const detailNoteStyles = useThemedStyles(buildDetailNoteStyles);
  const palette = useThemeColors();
  const [doc, setDoc] = useState<Document | null>(null);
  const [manifest, setManifest] = useState<DocumentManifest | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createShelfOpen, setCreateShelfOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("contents");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const docList = useMemo(() => (doc ? [doc] : null), [doc]);
  const {
    customShelves,
    memberships,
    workingShelfId,
    createShelf,
    addDocumentToShelf,
    toggleDocumentShelf,
  } = useLibraryShelves(docList);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      client.document.get({ id }),
      client.document.getManifest({ id }),
      client.highlight.list({ documentId: id }),
      client.note.list({ documentId: id }),
    ])
      .then(([docRes, manifestRes, highlightRes, noteRes]) => {
        if (cancelled) return;
        if (!docRes.data) {
          setError("Document not found");
          return;
        }
        setDoc(docRes.data);
        setManifest(manifestRes.data ?? null);
        setHighlights(highlightRes.data?.items ?? []);
        setNotes(noteRes.data?.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, id]);

  const currentOrder = sectionOrderFromKey(doc?.progress?.sectionKey) ?? 0;
  const pct = doc ? progressPercent(doc) : 0;
  const openReader = useCallback(() => {
    if (doc) router.push(`/read/${doc.id}`);
  }, [doc, router]);
  const highlightsById = useMemo(() => {
    const map = new Map<string, Highlight>();
    for (const highlight of highlights) map.set(highlight.id, highlight);
    return map;
  }, [highlights]);
  const notesWithHighlights = useMemo(
    () =>
      notes.map((note) => ({
        ...note,
        highlight: note.highlightId ? highlightsById.get(note.highlightId) : undefined,
      })),
    [highlightsById, notes],
  );
  const noteCounts = useMemo(
    () => ({
      all: notes.length,
      attached: notes.filter((note) => note.highlightId).length,
      standalone: notes.filter((note) => !note.highlightId).length,
    }),
    [notes],
  );
  const visibleNotes = useMemo(() => {
    if (noteFilter === "attached") return notesWithHighlights.filter((note) => note.highlightId);
    if (noteFilter === "standalone") return notesWithHighlights.filter((note) => !note.highlightId);
    return notesWithHighlights;
  }, [noteFilter, notesWithHighlights]);

  const createStandaloneNote = useCallback(async () => {
    if (!doc) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    setSavingNote(true);
    try {
      const res = await client.note.create({ documentId: doc.id, body: trimmed });
      if (res.data) {
        setNotes((prev) => [res.data, ...prev]);
        setNoteDraft("");
        setActiveTab("notes");
      }
    } finally {
      setSavingNote(false);
    }
  }, [client, doc, noteDraft]);

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
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.iconButton}>
              <Icons.Bookmark size={16} color={palette.fg} />
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.iconButton}>
              <Icons.Share size={16} color={palette.fg} />
            </Pressable>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {!doc ? (
          <DetailSkeleton />
        ) : (
          <>
            <View style={styles.detailHero}>
              <LibraryCover doc={doc} width={140} height={212} />
            </View>
            <View style={styles.detailTitleWrap}>
              <Text style={styles.eyebrow}>
                {KIND_LABEL[doc.kind]} · {manifest ? formatWordCount(manifest.wordCount) : "EPUB"}
              </Text>
              <Text style={styles.detailTitle}>{doc.title}</Text>
              <Text style={styles.detailAuthor}>{sourceLabel(doc, manifest)}</Text>
            </View>

            <View style={styles.buttonRow}>
              <Button fullWidth style={{ flex: 1 }} onPress={openReader}>
                {`Continue · ${pct}%`}
              </Button>
              <Pressable accessibilityRole="button" style={styles.iconButton} onPress={openReader}>
                <Icons.Sparkles size={16} color={palette.accent} />
              </Pressable>
            </View>

            <View style={styles.detailShelves}>
              <Text style={styles.eyebrow}>On shelves · {memberships[doc.id]?.length ?? 0}</Text>
              <DocumentShelfChips
                shelves={customShelves}
                selectedShelves={memberships[doc.id] ?? []}
                workingShelfId={workingShelfId}
                onToggle={(shelf, selected) => {
                  void toggleDocumentShelf(shelf, doc.id, selected);
                }}
                onCreate={() => setCreateShelfOpen(true)}
              />
            </View>

            <View style={styles.tabStrip}>
              {[
                { key: "contents", label: "Contents", count: manifest?.sections.length ?? 0 },
                { key: "about", label: "About", count: null },
                { key: "notes", label: "Notes", count: notes.length },
              ].map((tab) => (
                <ChipButton
                  key={tab.key}
                  variant={activeTab === tab.key ? "active" : "filled"}
                  onPress={() => setActiveTab(tab.key as DetailTab)}
                >
                  {tab.count === null ? tab.label : `${tab.label} · ${tab.count}`}
                </ChipButton>
              ))}
            </View>

            {activeTab === "notes" ? (
              <NotesTab
                notes={visibleNotes}
                noteFilter={noteFilter}
                noteCounts={noteCounts}
                draft={noteDraft}
                saving={savingNote}
                styles={styles}
                detailNoteStyles={detailNoteStyles}
                palette={palette}
                onDraftChange={setNoteDraft}
                onFilterChange={setNoteFilter}
                onSave={createStandaloneNote}
                onOpenReader={openReader}
              />
            ) : activeTab === "about" ? (
              <View style={detailNoteStyles.about}>
                <Text style={styles.eyebrow}>About</Text>
                <Text style={detailNoteStyles.aboutTitle}>{doc.title}</Text>
                <Text style={detailNoteStyles.aboutText}>
                  {sourceLabel(doc, manifest)} ·{" "}
                  {manifest ? formatWordCount(manifest.wordCount) : "Processing metadata"}
                </Text>
              </View>
            ) : manifest ? (
              manifest.sections.map((section) => {
                const current = section.order === currentOrder;
                const read = section.order < currentOrder;
                return (
                  <View
                    key={section.sectionKey}
                    style={[styles.sectionRow, current ? styles.sectionRowCurrent : null]}
                  >
                    <Text style={styles.sectionNum}>
                      {String(section.order + 1).padStart(2, "0")}
                    </Text>
                    <View style={styles.sectionBody}>
                      <Text style={styles.sectionTitle} numberOfLines={2}>
                        {section.title || `Section ${section.order + 1}`}
                      </Text>
                      <Text style={styles.sectionMeta}>{estimateMinutes(section)}</Text>
                    </View>
                    {read && <Icons.Check size={14} color={color.status.success} />}
                    {current && <Icons.Chevron size={14} color={palette.fgSubtle} />}
                  </View>
                );
              })
            ) : (
              <Skeleton height={260} />
            )}
          </>
        )}
      </ScrollView>
      <CreateShelfSheet
        visible={createShelfOpen}
        onClose={() => setCreateShelfOpen(false)}
        onCreate={async (draft) => {
          if (!doc) return;
          const shelf = await createShelf(draft);
          if (shelf) {
            await addDocumentToShelf(shelf, doc.id);
            setCreateShelfOpen(false);
          }
        }}
      />
    </View>
  );
}

function NotesTab({
  notes,
  noteFilter,
  noteCounts,
  draft,
  saving,
  styles,
  detailNoteStyles,
  palette,
  onDraftChange,
  onFilterChange,
  onSave,
  onOpenReader,
}: {
  notes: Array<Note & { highlight?: Highlight }>;
  noteFilter: NoteFilter;
  noteCounts: Record<NoteFilter, number>;
  draft: string;
  saving: boolean;
  styles: LibraryStyles;
  detailNoteStyles: DetailNoteStyles;
  palette: ThemeColors;
  onDraftChange: (value: string) => void;
  onFilterChange: (filter: NoteFilter) => void;
  onSave: () => void;
  onOpenReader: () => void;
}) {
  return (
    <View>
      <View style={detailNoteStyles.composer}>
        <View style={detailNoteStyles.composerIcon}>
          <Icons.Note size={14} color={palette.fgSubtle} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextInput
            value={draft}
            multiline
            placeholder="A thought about this book..."
            placeholderTextColor={palette.fgMuted}
            style={detailNoteStyles.composerInput}
            onChangeText={onDraftChange}
          />
          <View style={detailNoteStyles.composerFooter}>
            <Chip variant="outline">Whole book</Chip>
            <View style={{ flex: 1 }} />
            <Button size="sm" disabled={saving || !draft.trim()} onPress={onSave}>
              Save
            </Button>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {[
          ["all", "All"],
          ["attached", "Attached"],
          ["standalone", "Standalone"],
        ].map(([value, label]) => (
          <ChipButton
            key={value}
            variant={noteFilter === value ? "active" : "outline"}
            onPress={() => onFilterChange(value as NoteFilter)}
          >
            {label} · {noteCounts[value as NoteFilter]}
          </ChipButton>
        ))}
      </ScrollView>

      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No notes in this view</Text>
          <Text style={styles.emptyText}>
            Standalone thoughts and highlighted notes collect here.
          </Text>
        </View>
      ) : (
        notes.map((note) => (
          <DetailNoteItem
            key={note.id}
            note={note}
            detailNoteStyles={detailNoteStyles}
            palette={palette}
            onOpen={onOpenReader}
          />
        ))
      )}
    </View>
  );
}

function DetailNoteItem({
  note,
  detailNoteStyles,
  palette,
  onOpen,
}: {
  note: Note & { highlight?: Highlight };
  detailNoteStyles: DetailNoteStyles;
  palette: ThemeColors;
  onOpen: () => void;
}) {
  const attached = Boolean(note.highlight);
  const accent = note.highlight ? HIGHLIGHT_COLOR[note.highlight.color] : palette.fgMuted;
  return (
    <Pressable accessibilityRole="button" style={detailNoteStyles.item} onPress={onOpen}>
      <View style={detailNoteStyles.meta}>
        {attached ? (
          <View style={[detailNoteStyles.dot, { backgroundColor: accent }]} />
        ) : (
          <Icons.Note size={13} color={palette.fgMuted} />
        )}
        <Text style={detailNoteStyles.metaText}>{noteLocationLabel(note, note.highlight)}</Text>
        <Text style={detailNoteStyles.date}>{formatDate(note.createdAt)}</Text>
      </View>
      {note.highlight && (
        <Text style={[detailNoteStyles.quote, { borderLeftColor: accent }]} numberOfLines={3}>
          {`“${note.highlight.textSnippet}”`}
        </Text>
      )}
      <View style={[detailNoteStyles.noteBox, attached ? detailNoteStyles.noteBoxAttached : null]}>
        <Icons.Note size={13} color={palette.fgSubtle} />
        <Text style={detailNoteStyles.noteText}>{note.body}</Text>
      </View>
    </Pressable>
  );
}

function noteLocationLabel(note: Note, highlight?: Highlight): string {
  const sectionKey = note.sectionKey ?? highlight?.sectionKey ?? null;
  if (!sectionKey) return "Whole book";
  const match = /:(\d+)$/.exec(sectionKey);
  return match ? `Ch. ${Number(match[1]) + 1}` : "Section note";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const buildDetailNoteStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    composer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: 16,
      backgroundColor: palette.surfaceRaised,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    composerIcon: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: palette.border,
    },
    composerInput: {
      minHeight: 46,
      padding: 0,
      fontFamily: font.nativeFamily.reading,
      fontSize: 15,
      lineHeight: 22,
      color: palette.fg,
      textAlignVertical: "top",
    },
    composerFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    item: {
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      paddingVertical: 14,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
    },
    metaText: {
      flex: 1,
      fontFamily: font.nativeFamily.ui,
      fontSize: 12,
      fontWeight: "600",
      color: palette.fg,
    },
    date: {
      fontFamily: font.nativeFamily.ui,
      fontSize: 11,
      color: palette.fgMuted,
    },
    quote: {
      marginLeft: 18,
      borderLeftWidth: 2,
      paddingLeft: 12,
      fontFamily: font.nativeFamily.reading,
      fontSize: 13,
      fontStyle: "italic",
      lineHeight: 20,
      color: palette.fg,
    },
    noteBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 12,
      backgroundColor: palette.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    noteBoxAttached: {
      marginLeft: 18,
    },
    noteText: {
      flex: 1,
      fontFamily: font.nativeFamily.reading,
      fontSize: 13,
      lineHeight: 20,
      color: palette.fg,
    },
    about: {
      paddingTop: 8,
      paddingBottom: 20,
    },
    aboutTitle: {
      marginTop: 6,
      fontFamily: font.nativeFamily.display,
      fontSize: 24,
      fontWeight: "400",
      color: palette.fg,
    },
    aboutText: {
      marginTop: 8,
      fontFamily: font.nativeFamily.ui,
      fontSize: 14,
      lineHeight: 21,
      color: palette.fgSubtle,
    },
  });

type DetailNoteStyles = ReturnType<typeof buildDetailNoteStyles>;

function DetailSkeleton() {
  return (
    <View>
      <Skeleton width={140} height={212} style={{ alignSelf: "center", marginTop: 20 }} />
      <Skeleton width="70%" height={28} style={{ alignSelf: "center", marginTop: 20 }} />
      <Skeleton width="50%" height={14} style={{ alignSelf: "center", marginTop: 10 }} />
      <Skeleton height={260} style={{ marginTop: 24 }} />
    </View>
  );
}
