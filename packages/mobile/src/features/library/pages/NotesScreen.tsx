import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  ChipButton,
  Icons,
  Sheet,
  Skeleton,
  Wordmark,
  color,
  font,
  radius,
} from "@bainder/ui";
import type { Document, Highlight, Note } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider";
import { HIGHLIGHT_COLOR } from "../constants";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useLibraryHighlights } from "../hooks/useLibraryHighlights";
import { useLibraryNotes, type LibraryNote } from "../hooks/useLibraryNotes";
import { libraryStyles } from "../library.styles";

type NoteFilter = "all" | "attached" | "standalone";
type EditorState = Note | "new" | null;
type EnrichedNote = LibraryNote & { highlight?: Highlight };

const filters: Array<{ value: NoteFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "attached", label: "Attached" },
  { value: "standalone", label: "Standalone" },
];

export function NotesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client } = useSdk();
  const { documents } = useLibraryDocuments();
  const { highlights } = useLibraryHighlights(documents);
  const { notes, error, refresh } = useLibraryNotes(documents);
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [editor, setEditor] = useState<EditorState>(null);

  const highlightsById = useMemo(() => {
    const map = new Map<string, Highlight>();
    for (const item of highlights ?? []) map.set(item.id, item);
    return map;
  }, [highlights]);

  const enriched = useMemo(() => {
    if (!notes) return null;
    return notes.map((note) => ({
      ...note,
      highlight: note.highlightId ? highlightsById.get(note.highlightId) : undefined,
    }));
  }, [highlightsById, notes]);

  const counts = useMemo(() => {
    const items = enriched ?? [];
    return {
      all: items.length,
      attached: items.filter((note) => note.highlightId).length,
      standalone: items.filter((note) => !note.highlightId).length,
    };
  }, [enriched]);

  const visible = useMemo(() => {
    if (!enriched) return null;
    if (filter === "attached") return enriched.filter((note) => note.highlightId);
    if (filter === "standalone") return enriched.filter((note) => !note.highlightId);
    return enriched;
  }, [enriched, filter]);

  const sourceCount = useMemo(() => {
    const ids = new Set<string>();
    for (const note of notes ?? []) ids.add(note.documentId);
    return ids.size;
  }, [notes]);

  const readyDocuments = useMemo(
    () => (documents ?? []).filter((doc) => doc.status === "processed"),
    [documents],
  );

  const saveNote = async (documentId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed || !documentId) return;
    if (editor && editor !== "new") {
      await client.note.update({ id: editor.id, body: trimmed });
    } else {
      await client.note.create({ documentId, body: trimmed });
    }
    setEditor(null);
    await refresh();
  };

  const deleteNote = async () => {
    if (!editor || editor === "new") return;
    await client.note.delete({ id: editor.id });
    setEditor(null);
    await refresh();
  };

  return (
    <View style={libraryStyles.root}>
      <ScrollView
        style={libraryStyles.scroll}
        contentContainerStyle={[
          libraryStyles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={libraryStyles.header}>
          <Wordmark size="sm" />
          <View style={styles.headerActions}>
            <View style={libraryStyles.iconButton}>
              <Icons.Search size={16} color={color.paper[800]} />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={readyDocuments.length === 0}
              style={[libraryStyles.iconButton, styles.primaryIcon]}
              onPress={() => setEditor("new")}
            >
              <Icons.Plus size={16} color={color.paper[50]} />
            </Pressable>
          </View>
        </View>

        <View style={libraryStyles.titleBlock}>
          <Text style={libraryStyles.eyebrow}>
            {counts.all} notes · {sourceCount} sources
          </Text>
          <Text style={libraryStyles.title}>Notes</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={libraryStyles.chipRow}
        >
          {filters.map((item) => (
            <ChipButton
              key={item.value}
              variant={filter === item.value ? "active" : "outline"}
              onPress={() => setFilter(item.value)}
            >
              {item.label} · {counts[item.value]}
            </ChipButton>
          ))}
        </ScrollView>

        {error && <Text style={libraryStyles.error}>{error}</Text>}
        {!visible ? (
          <NotesSkeleton />
        ) : visible.length === 0 ? (
          <View style={libraryStyles.empty}>
            <Text style={libraryStyles.emptyTitle}>No notes yet</Text>
            <Text style={libraryStyles.emptyText}>
              Standalone thoughts and highlighted notes collect here.
            </Text>
          </View>
        ) : (
          visible.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onPress={() => setEditor(note)}
              onOpen={() => router.push(`/read/${note.document.id}`)}
            />
          ))
        )}
      </ScrollView>

      <NoteEditorSheet
        visible={editor !== null}
        note={editor && editor !== "new" ? editor : null}
        documents={readyDocuments}
        onClose={() => setEditor(null)}
        onSave={saveNote}
        onDelete={editor && editor !== "new" ? deleteNote : undefined}
      />
    </View>
  );
}

function NoteItem({
  note,
  onPress,
  onOpen,
}: {
  note: EnrichedNote;
  onPress: () => void;
  onOpen: () => void;
}) {
  const attached = Boolean(note.highlight);
  const accent = note.highlight ? HIGHLIGHT_COLOR[note.highlight.color] : color.paper[400];
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.noteItem, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <View style={styles.noteMeta}>
        {attached ? (
          <View style={[styles.noteDot, { backgroundColor: accent }]} />
        ) : (
          <Icons.Note size={13} color={color.paper[500]} />
        )}
        <Text style={styles.noteSource} numberOfLines={1}>
          {note.document.title}
        </Text>
        <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
      </View>

      {note.highlight && (
        <Text style={[styles.noteQuote, { borderLeftColor: accent }]} numberOfLines={3}>
          {`“${note.highlight.textSnippet}”`}
        </Text>
      )}

      <View style={[styles.noteBody, attached ? styles.noteBodyAttached : null]}>
        <Icons.Note size={13} color={color.paper[600]} />
        <Text style={styles.noteBodyText}>{note.body}</Text>
      </View>

      <View style={[styles.noteActions, attached ? styles.noteActionsAttached : null]}>
        <Text style={styles.noteAction}>Edit</Text>
        <Pressable accessibilityRole="button" onPress={onOpen}>
          <Text style={styles.noteAction}>{attached ? "Open in book" : "Attach to passage"}</Text>
        </Pressable>
        <Text style={styles.noteAsk}>Ask Bainder</Text>
      </View>
    </Pressable>
  );
}

function NoteEditorSheet({
  visible,
  note,
  documents,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  note: Note | null;
  documents: ReadonlyArray<Document>;
  onClose: () => void;
  onSave: (documentId: string, body: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [documentId, setDocumentId] = useState("");
  const [body, setBody] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDocumentId(note?.documentId ?? documents[0]?.id ?? "");
    setBody(note?.body ?? "");
  }, [documents, note, visible]);

  const handleClose = () => {
    setDocumentId("");
    setBody("");
    onClose();
  };

  const handleSave = async () => {
    setWorking(true);
    try {
      await onSave(documentId, body);
      setDocumentId("");
      setBody("");
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setWorking(true);
    try {
      await onDelete();
      setDocumentId("");
      setBody("");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={handleClose} style={styles.sheet}>
      <Text style={styles.sheetEyebrow}>{note ? "Edit note" : "New note"}</Text>
      <Text style={styles.sheetTitle}>
        {note ? "Keep the thought clear." : "Capture a thought."}
      </Text>

      {!note && documents.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceRow}
        >
          {documents.map((doc) => (
            <ChipButton
              key={doc.id}
              variant={documentId === doc.id ? "active" : "outline"}
              onPress={() => setDocumentId(doc.id)}
            >
              {doc.title}
            </ChipButton>
          ))}
        </ScrollView>
      )}

      <TextInput
        value={body}
        multiline
        placeholder="What did you think?"
        placeholderTextColor={color.paper[500]}
        style={styles.noteInput}
        onChangeText={setBody}
      />

      <View style={styles.sheetActions}>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            disabled={working}
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            Delete
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={working}
          style={{ flex: 1 }}
          onPress={handleClose}
        >
          Cancel
        </Button>
        <Button
          disabled={working || !documentId || !body.trim()}
          style={{ flex: 2 }}
          onPress={handleSave}
        >
          Save note
        </Button>
      </View>
    </Sheet>
  );
}

function NotesSkeleton() {
  return (
    <View>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.noteItem}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="95%" height={42} />
          <Skeleton width="75%" height={44} />
        </View>
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryIcon: {
    backgroundColor: color.paper[900],
  },
  pressed: {
    opacity: 0.72,
  },
  noteItem: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.paper[200],
    paddingVertical: 14,
  },
  noteMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  noteSource: {
    flex: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    fontWeight: "600",
    color: color.paper[800],
  },
  noteDate: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
  },
  noteQuote: {
    marginLeft: 18,
    borderLeftWidth: 2,
    paddingLeft: 12,
    fontFamily: font.nativeFamily.reading,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    color: color.paper[900],
  },
  noteBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 12,
    backgroundColor: color.paper[100],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteBodyAttached: {
    marginLeft: 18,
  },
  noteBodyText: {
    flex: 1,
    fontFamily: font.nativeFamily.reading,
    fontSize: 13,
    lineHeight: 20,
    color: color.paper[800],
  },
  noteActions: {
    flexDirection: "row",
    gap: 12,
  },
  noteActionsAttached: {
    marginLeft: 18,
  },
  noteAction: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    color: color.paper[500],
  },
  noteAsk: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    fontWeight: "600",
    color: color.wine[700],
  },
  sheet: {
    paddingHorizontal: 24,
  },
  sheetEyebrow: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.44,
    textTransform: "uppercase",
    color: color.paper[500],
  },
  sheetTitle: {
    fontFamily: font.nativeFamily.display,
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 28,
    color: color.paper[900],
  },
  sourceRow: {
    gap: 8,
    paddingVertical: 4,
  },
  noteInput: {
    minHeight: 132,
    borderWidth: 1.5,
    borderColor: color.paper[900],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.nativeFamily.reading,
    fontSize: 15,
    lineHeight: 23,
    color: color.paper[900],
    textAlignVertical: "top",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 8,
  },
  deleteButton: {
    flex: 1,
  },
});
