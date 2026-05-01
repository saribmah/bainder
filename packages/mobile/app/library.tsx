import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  BookCover,
  Button,
  Card,
  Chip,
  Hairline,
  IconButton,
  Icons,
  Input,
  Skeleton,
  Toast,
  color,
  useTheme,
} from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { authClient } from "../src/auth/auth.client.ts";
import { useSdk } from "../src/sdk/sdk.provider.tsx";

const COVER_W = 44;
const COVER_H = 60;

const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
  pdf: "PDF",
  image: "Image",
  text: "Text",
  other: "Other",
};

const KIND_BG: Record<Document["kind"], string> = {
  epub: "#d64c29",
  pdf: "#347ec4",
  image: "#37b880",
  text: "#bda257",
  other: "#94a0aa",
};

const RELATIVE_THRESHOLDS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

const formatRelativeTime = (iso: string): string => {
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let value = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [step, unit] of RELATIVE_THRESHOLDS) {
    if (Math.abs(value) < step) return fmt.format(Math.round(value), unit);
    value /= step;
  }
  return fmt.format(Math.round(value), "year");
};

const progressLabel = (doc: Document): string | null => {
  const p = doc.progress;
  if (!p) return null;
  if (p.epubChapterOrder !== null) {
    return `Chapter ${p.epubChapterOrder + 1} · ${formatRelativeTime(p.updatedAt)}`;
  }
  if (p.pdfPageNumber !== null) {
    return `Page ${p.pdfPageNumber} · ${formatRelativeTime(p.updatedAt)}`;
  }
  return null;
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client } = useSdk();
  const { cycleTheme, theme } = useTheme();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await client.document.list();
      if (res.data) setDocuments(res.data.items);
      else setError("Failed to load documents");
    } catch (err) {
      setError(String(err));
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!documents) return;
    const hasPending = documents.some((d) => d.status === "uploading" || d.status === "processing");
    if (!hasPending) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [documents, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const upload = useCallback(async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/epub+zip", "text/plain", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
      // RN-specific FormData file shape — fetch's polyfill handles this.
      const file = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as File;
      const res = await client.document.create({ file });
      if (res.error) {
        setError("Upload failed");
      } else {
        setToast(`Uploaded ${asset.name}`);
        refresh();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }, [client, refresh]);

  const rename = useCallback(
    async (doc: Document, title: string) => {
      const res = await client.document.update({ id: doc.id, title });
      if (res.data) {
        const updated = res.data;
        setDocuments((prev) =>
          prev ? prev.map((d) => (d.id === updated.id ? updated : d)) : prev,
        );
        setToast("Renamed");
      } else {
        setError("Rename failed");
      }
    },
    [client],
  );

  const remove = useCallback(
    async (doc: Document) => {
      const res = await client.document.delete({ id: doc.id });
      if (res.error) {
        setError("Delete failed");
        return;
      }
      setDocuments((prev) => (prev ? prev.filter((d) => d.id !== doc.id) : prev));
      setToast(`Deleted ${doc.title}`);
    },
    [client],
  );

  const filtered = useMemo(() => {
    if (!documents) return null;
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) => d.title.toLowerCase().includes(q) || d.originalFilename.toLowerCase().includes(q),
    );
  }, [documents, query]);

  const ready = filtered?.filter((d) => d.status === "processed") ?? [];
  const pending = filtered?.filter((d) => d.status !== "processed") ?? [];
  const isEmpty = documents !== null && documents.length === 0;
  const isFilteredEmpty = filtered !== null && filtered.length === 0 && !isEmpty;

  const openKebab = (doc: Document) => {
    const actions = ["Rename", "Delete", "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: actions,
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) setRenameTarget(doc);
          if (idx === 1) setDeleteTarget(doc);
        },
      );
    } else {
      Alert.alert(doc.title, undefined, [
        { text: "Rename", onPress: () => setRenameTarget(doc) },
        { text: "Delete", style: "destructive", onPress: () => setDeleteTarget(doc) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.brand}>bainder</Text>
        <View style={styles.headerActions}>
          <Button variant="ghost" size="sm" onPress={cycleTheme}>
            {theme}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => authClient.signOut()}>
            Sign out
          </Button>
        </View>
      </View>

      <Hairline />

      <View style={{ marginTop: 24 }}>
        <Text style={styles.h1}>Library</Text>
        <Text style={styles.lead}>
          Drop in a PDF, EPUB, image, or text file. Bainder extracts and organises them.
        </Text>
      </View>

      <UploadZone compact={!isEmpty} uploading={uploading} onPress={upload} />

      {documents !== null && documents.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Input
            placeholder="Search your library…"
            value={query}
            onChangeText={setQuery}
            iconStart={<Icons.Search size={18} color={color.paper[500]} />}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {documents === null ? (
        <View style={{ marginTop: 32, gap: 12 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <DocumentRowSkeleton key={i} />
          ))}
        </View>
      ) : isFilteredEmpty ? (
        <Text style={styles.muted}>{`No documents match "${query}".`}</Text>
      ) : isEmpty ? null : (
        <>
          {pending.length > 0 && (
            <View style={{ marginTop: 32 }}>
              <Text style={styles.sectionLabel}>Processing</Text>
              <View style={{ marginTop: 12, gap: 12 }}>
                {pending.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </View>
            </View>
          )}

          {ready.length > 0 && (
            <View style={{ marginTop: 32 }}>
              <Text style={styles.sectionLabel}>Ready to read</Text>
              <View style={{ marginTop: 12, gap: 12 }}>
                {ready.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onOpen={() => router.push(`/read/${doc.id}`)}
                    onMore={() => openKebab(doc)}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {renameTarget && (
        <RenameDialog
          doc={renameTarget}
          onCancel={() => setRenameTarget(null)}
          onSave={async (title) => {
            await rename(renameTarget, title);
            setRenameTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          doc={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await remove(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}

      {toast && (
        <View style={styles.toastWrap}>
          <Toast iconStart={<Icons.Check size={18} color={color.status.success} />}>{toast}</Toast>
        </View>
      )}
    </ScrollView>
  );
}

function UploadZone({
  compact,
  uploading,
  onPress,
}: {
  compact: boolean;
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={uploading}
      style={({ pressed }) => [
        styles.upload,
        compact ? styles.uploadCompact : styles.uploadFull,
        { borderColor: pressed ? color.paper[500] : color.paper[300] },
      ]}
    >
      <View style={[styles.uploadIcon, compact && { width: 48, height: 48 }]}>
        <Icons.Plus size={compact ? 22 : 32} color={color.paper[700]} />
      </View>
      <View style={compact ? { flex: 1 } : { alignItems: "center" }}>
        <Text style={compact ? styles.uploadTitleCompact : styles.uploadTitle}>
          {compact ? "Add a document" : "Drop a file to begin"}
        </Text>
        <Text style={styles.uploadSub}>PDF · EPUB · text · image — up to 100 MB</Text>
      </View>
      {compact && (
        <Button variant="wine" size="md" disabled={uploading} onPress={onPress}>
          {uploading ? "Uploading…" : "Browse"}
        </Button>
      )}
    </Pressable>
  );
}

function DocumentRow({
  doc,
  onOpen,
  onMore,
}: {
  doc: Document;
  onOpen?: () => void;
  onMore?: () => void;
}) {
  const interactive = doc.status === "processed";
  const subtitle = progressLabel(doc) ?? doc.originalFilename;
  const subtitleEmphasised = progressLabel(doc) !== null;

  return (
    <Card style={styles.row} onPress={interactive ? onOpen : undefined}>
      <DocumentCover doc={doc} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {doc.title}
        </Text>
        <Text
          style={[styles.rowSub, subtitleEmphasised && { color: color.paper[700] }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <Chip variant="outline">{KIND_LABEL[doc.kind]}</Chip>
      {doc.status === "processing" && <Text style={styles.statusMuted}>Processing…</Text>}
      {doc.status === "failed" && (
        <Text style={styles.statusError} numberOfLines={1}>
          {doc.errorReason ?? "Failed"}
        </Text>
      )}
      {interactive && onMore && (
        <IconButton aria-label="More actions" size="sm" onPress={onMore}>
          <Icons.MoreVertical size={16} color={color.paper[700]} />
        </IconButton>
      )}
    </Card>
  );
}

function DocumentCover({ doc }: { doc: Document }) {
  const { client, baseUrl } = useSdk();
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    if (doc.kind !== "epub" || doc.status !== "processed") return;
    let cancelled = false;
    client.document
      .getEpubDetail({ id: doc.id })
      .then((res) => {
        if (cancelled) return;
        const path = res.data?.book.coverImage;
        if (path) setCoverSrc(`${baseUrl}/documents/${doc.id}/${path}`);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, baseUrl, doc.id, doc.kind, doc.status]);

  return (
    <BookCover
      width={COVER_W}
      height={COVER_H}
      src={coverSrc ?? undefined}
      backgroundColor={KIND_BG[doc.kind]}
      alt=""
    />
  );
}

function DocumentRowSkeleton() {
  return (
    <Card style={styles.row}>
      <Skeleton width={COVER_W} height={COVER_H} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={12} />
      </View>
      <Skeleton shape="pill" width={56} height={24} />
    </Card>
  );
}

function RenameDialog({
  doc,
  onCancel,
  onSave,
}: {
  doc: Document;
  onCancel: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const [value, setValue] = useState(doc.title);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== doc.title && !saving;

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rename</Text>
            <IconButton aria-label="Close" size="sm" onPress={onCancel}>
              <Icons.Close size={14} color={color.paper[700]} />
            </IconButton>
          </View>
          <Input value={value} onChangeText={setValue} autoFocus maxLength={200} />
          <View style={styles.modalFooter}>
            <Button variant="ghost" onPress={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onPress={async () => {
                setSaving(true);
                try {
                  await onSave(trimmed);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DeleteDialog({
  doc,
  onCancel,
  onConfirm,
}: {
  doc: Document;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  return (
    <Modal animationType="slide" transparent visible onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete document?</Text>
            <IconButton aria-label="Close" size="sm" onPress={onCancel}>
              <Icons.Close size={14} color={color.paper[700]} />
            </IconButton>
          </View>
          <Text style={styles.modalBody}>
            <Text style={{ fontWeight: "600" }}>{`"${doc.title}"`}</Text>
            {" and all of its highlights will be permanently removed. This can't be undone."}
          </Text>
          <View style={styles.modalFooter}>
            <Button variant="ghost" onPress={onCancel} disabled={working}>
              Cancel
            </Button>
            <Button
              variant="wine"
              disabled={working}
              onPress={async () => {
                setWorking(true);
                try {
                  await onConfirm();
                } finally {
                  setWorking(false);
                }
              }}
            >
              {working ? "Deleting…" : "Delete"}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  brand: { fontSize: 22, fontWeight: "500", color: color.paper[900] },
  h1: {
    fontSize: 36,
    fontWeight: "500",
    color: color.paper[900],
    letterSpacing: -0.5,
  },
  lead: {
    marginTop: 8,
    fontSize: 17,
    color: color.paper[700],
    lineHeight: 25,
  },
  upload: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    backgroundColor: color.paper[100],
  },
  uploadFull: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 16,
  },
  uploadCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: color.paper[50],
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { fontSize: 20, fontWeight: "500", color: color.paper[900] },
  uploadTitleCompact: { fontSize: 15, fontWeight: "500", color: color.paper[900] },
  uploadSub: { marginTop: 4, fontSize: 13, color: color.paper[600] },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: color.paper[600],
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowTitle: { fontSize: 15, fontWeight: "500", color: color.paper[900] },
  rowSub: { marginTop: 4, fontSize: 13, color: color.paper[500] },
  statusMuted: { fontSize: 13, color: color.paper[500] },
  statusError: { fontSize: 13, color: color.status.error },
  error: { marginTop: 16, fontSize: 13, color: color.status.error },
  muted: { marginTop: 32, fontSize: 15, color: color.paper[500] },
  toastWrap: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,15,10,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: color.paper[50],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 17, fontWeight: "500", color: color.paper[900] },
  modalBody: { fontSize: 15, color: color.paper[700], lineHeight: 22 },
  modalFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
