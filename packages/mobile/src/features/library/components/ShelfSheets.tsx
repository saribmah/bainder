import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Icons, Input, Sheet, color, font, radius } from "@bainder/ui";
import type { Document, ShelfCustom } from "@bainder/sdk";
import { LibraryCover } from "./LibraryCover";
import { SpineFan } from "./ShelfArtwork";
import { sourceLabel, statusLabel } from "../utils/document";

type ShelfDraft = {
  name: string;
  description: string;
};

export function CreateShelfSheet({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (draft: ShelfDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ShelfDraft>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const canSave = draft.name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onCreate(draft);
      setDraft({ name: "", description: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} style={styles.sheet}>
      <SheetHeader eyebrow="New shelf" title="Group books your way." />
      <ShelfFields draft={draft} onChange={setDraft} />
      <View style={styles.previewRow}>
        <SpineFan
          shelf={{
            kind: "custom",
            id: draft.name || "new-shelf",
            name: draft.name || "New shelf",
            description: draft.description || null,
            itemCount: 0,
            position: null,
            createdAt: "",
            updatedAt: "",
          }}
          size={36}
        />
        <Text style={styles.muted}>The first covers you add will shape this shelf.</Text>
      </View>
      <View style={styles.actions}>
        <Button variant="ghost" onPress={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onPress={save} disabled={!canSave}>
          {saving ? "Creating..." : "Create shelf"}
        </Button>
      </View>
    </Sheet>
  );
}

export function EditShelfSheet({
  visible,
  shelf,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  shelf: ShelfCustom | null;
  onClose: () => void;
  onSave: (draft: ShelfDraft) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<ShelfDraft>({
    name: shelf?.name ?? "",
    description: shelf?.description ?? "",
  });

  useEffect(() => {
    if (!shelf || !visible) return;
    setDraft({ name: shelf.name, description: shelf.description ?? "" });
    setConfirmDelete(false);
  }, [shelf, visible]);

  if (!shelf) return null;

  const canSave =
    draft.name.trim().length > 0 &&
    (draft.name.trim() !== shelf.name || draft.description.trim() !== (shelf.description ?? "")) &&
    !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} style={styles.sheet}>
      <SheetHeader eyebrow="Edit shelf" title="Keep the shelf clear." />
      <ShelfFields draft={draft} onChange={setDraft} />
      <View style={styles.actionsSplit}>
        <Button
          variant="ghost"
          onPress={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            setSaving(true);
            try {
              await onDelete();
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          {confirmDelete ? "Confirm delete" : "Delete shelf"}
        </Button>
        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onPress={save} disabled={!canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

export function AddToShelfSheet({
  visible,
  doc,
  shelves,
  selectedShelves,
  workingShelfId,
  onClose,
  onToggle,
  onCreate,
}: {
  visible: boolean;
  doc: Document | null;
  shelves: ReadonlyArray<ShelfCustom>;
  selectedShelves: ReadonlyArray<ShelfCustom>;
  workingShelfId: string | null;
  onClose: () => void;
  onToggle: (shelf: ShelfCustom, selected: boolean) => void;
  onCreate: () => void;
}) {
  const selectedIds = new Set(selectedShelves.map((shelf) => shelf.id));

  return (
    <Sheet visible={visible} onClose={onClose} style={styles.sheet}>
      {doc && (
        <View style={styles.bookRow}>
          <LibraryCover doc={doc} width={38} height={58} />
          <View style={styles.bookBody}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {doc.title}
            </Text>
            <Text style={styles.bookSub} numberOfLines={1}>
              {sourceLabel(doc)}
            </Text>
          </View>
        </View>
      )}
      <Text style={styles.eyebrow}>Add to shelf</Text>
      <View>
        {shelves.map((shelf) => {
          const selected = selectedIds.has(shelf.id);
          return (
            <Pressable
              key={shelf.id}
              accessibilityRole="button"
              disabled={workingShelfId === shelf.id}
              style={styles.shelfRow}
              onPress={() => onToggle(shelf, selected)}
            >
              <View style={[styles.checkbox, selected ? styles.checkboxActive : null]}>
                {selected && <Icons.Check size={13} color={color.paper[50]} strokeWidth={2.5} />}
              </View>
              <View style={styles.shelfBody}>
                <Text style={styles.shelfName} numberOfLines={1}>
                  {shelf.name}
                </Text>
                {shelf.description && (
                  <Text style={styles.shelfNote} numberOfLines={1}>
                    {shelf.description}
                  </Text>
                )}
              </View>
              <Text style={styles.count}>{shelf.itemCount}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button variant="secondary" fullWidth iconStart={<Icons.Plus size={14} />} onPress={onCreate}>
        New shelf
      </Button>
      <Button fullWidth onPress={onClose}>
        Done
      </Button>
    </Sheet>
  );
}

export function AddBooksSheet({
  visible,
  shelf,
  documents,
  currentDocumentIds,
  onClose,
  onAdd,
}: {
  visible: boolean;
  shelf: ShelfCustom | null;
  documents: ReadonlyArray<Document>;
  currentDocumentIds: ReadonlySet<string>;
  onClose: () => void;
  onAdd: (doc: Document) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents
      .filter((doc) => doc.status === "processed" && !currentDocumentIds.has(doc.id))
      .filter((doc) => {
        if (!normalized) return true;
        return (
          doc.title.toLowerCase().includes(normalized) ||
          sourceLabel(doc).toLowerCase().includes(normalized) ||
          doc.originalFilename.toLowerCase().includes(normalized)
        );
      });
  }, [currentDocumentIds, documents, query]);

  if (!shelf) return null;

  return (
    <Sheet visible={visible} onClose={onClose} style={styles.sheetTall}>
      <SheetHeader eyebrow="Add books" title={shelf.name} />
      <Input value={query} onChangeText={setQuery} placeholder="Find books..." />
      <ScrollView style={styles.list} contentContainerStyle={{ gap: 4 }}>
        {available.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No available books</Text>
            <Text style={styles.emptyText}>
              {query.trim() ? "Try a different search." : "Everything processed is already here."}
            </Text>
          </View>
        ) : (
          available.map((doc) => (
            <View key={doc.id} style={styles.bookRow}>
              <LibraryCover doc={doc} width={38} height={58} />
              <View style={styles.bookBody}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {doc.title}
                </Text>
                <Text style={styles.bookSub} numberOfLines={1}>
                  {sourceLabel(doc)} · {statusLabel(doc)}
                </Text>
              </View>
              <Button
                size="sm"
                variant="secondary"
                disabled={workingId === doc.id}
                onPress={async () => {
                  setWorkingId(doc.id);
                  try {
                    await onAdd(doc);
                  } finally {
                    setWorkingId(null);
                  }
                }}
              >
                {workingId === doc.id ? "Adding..." : "Add"}
              </Button>
            </View>
          ))
        )}
      </ScrollView>
      <Button fullWidth onPress={onClose}>
        Done
      </Button>
    </Sheet>
  );
}

function ShelfFields({
  draft,
  onChange,
}: {
  draft: ShelfDraft;
  onChange: (draft: ShelfDraft) => void;
}) {
  return (
    <View style={styles.fields}>
      <View>
        <Text style={styles.label}>Name</Text>
        <Input
          value={draft.name}
          onChangeText={(name) => onChange({ ...draft, name })}
          placeholder="For the design talk"
          maxLength={80}
        />
      </View>
      <View>
        <Text style={styles.label}>Note · optional</Text>
        <Input
          value={draft.description}
          onChangeText={(description) => onChange({ ...draft, description })}
          placeholder="A line about why this shelf exists."
          maxLength={280}
        />
      </View>
    </View>
  );
}

function SheetHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: 16,
  },
  sheetTall: {
    maxHeight: "86%",
    gap: 16,
  },
  eyebrow: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.44,
    textTransform: "uppercase",
    color: color.paper[500],
  },
  title: {
    marginTop: 4,
    fontFamily: font.nativeFamily.display,
    fontSize: 26,
    fontWeight: "400",
    lineHeight: 30,
    color: color.paper[900],
  },
  fields: {
    gap: 12,
  },
  label: {
    marginBottom: 6,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.44,
    textTransform: "uppercase",
    color: color.paper[600],
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    backgroundColor: color.paper[100],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  muted: {
    flex: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    lineHeight: 16,
    color: color.paper[500],
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionsSplit: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: color.paper[200],
    paddingTop: 14,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    paddingVertical: 8,
  },
  bookBody: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    color: color.paper[900],
  },
  bookSub: {
    marginTop: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
  },
  shelfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.paper[200],
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: color.paper[300],
    borderRadius: 6,
  },
  checkboxActive: {
    borderColor: color.paper[900],
    backgroundColor: color.paper[900],
  },
  shelfBody: {
    flex: 1,
    minWidth: 0,
  },
  shelfName: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 14,
    fontWeight: "600",
    color: color.paper[900],
  },
  shelfNote: {
    marginTop: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
  },
  count: {
    fontFamily: font.nativeFamily.mono,
    fontSize: 11,
    color: color.paper[500],
  },
  list: {
    maxHeight: 420,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.paper[300],
    borderRadius: radius.lg,
    backgroundColor: color.paper[100],
    padding: 20,
  },
  emptyTitle: {
    fontFamily: font.nativeFamily.display,
    fontSize: 20,
    fontWeight: "500",
    color: color.paper[900],
  },
  emptyText: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    lineHeight: 16,
    color: color.paper[600],
  },
});
