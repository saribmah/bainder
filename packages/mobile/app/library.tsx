import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
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
import {
  BookCover,
  Button,
  Card,
  Chip,
  IconButton,
  Icons,
  Input,
  Skeleton,
  Toast,
  Wordmark,
  color,
  font,
  radius,
} from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { authClient } from "../src/auth/auth.client.ts";
import { useSdk } from "../src/sdk/sdk.provider.tsx";

const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
};

const KIND_BG: Record<Document["kind"], string> = {
  epub: color.highlight.yellow,
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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

const progressLabel = (doc: Document): string | null => {
  const p = doc.progress;
  if (!p) return null;
  return `Chapter ${p.epubChapterOrder + 1} · ${formatRelativeTime(p.updatedAt)}`;
};

const dayLabel = () => {
  const date = new Date();
  return `${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]} ${date.getDate()}`.toUpperCase();
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = authClient.useSession();
  const { client } = useSdk();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const reader = useMemo(() => {
    const name = session.data?.user.name?.trim();
    if (name) return name.split(/\s+/)[0] ?? "Reader";
    const email = session.data?.user.email?.trim();
    if (email) return email.split("@")[0] ?? "Reader";
    return "Reader";
  }, [session.data?.user.email, session.data?.user.name]);

  const refresh = useCallback(async () => {
    try {
      const res = await client.document.list();
      if (res.data) {
        setDocuments(res.data.items);
        setError(null);
      } else {
        setError("Failed to load documents");
      }
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
      type: ["application/epub+zip"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
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
  const hasDocuments = (documents?.length ?? 0) > 0;
  const isFilteredEmpty = filtered !== null && filtered.length === 0 && hasDocuments;
  const inProgress = ready
    .filter((doc) => doc.progress)
    .concat(ready.filter((doc) => !doc.progress));
  const recent = [...ready].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 98 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <DashboardHeader
          reader={reader}
          searchOpen={searchOpen}
          query={query}
          onQuery={setQuery}
          onToggleSearch={() => setSearchOpen((open) => !open)}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        {documents === null ? (
          <DashboardLoading />
        ) : isFilteredEmpty ? (
          <FilteredEmpty query={query} />
        ) : !hasDocuments ? (
          <DropDashboard uploading={uploading} onUpload={upload} />
        ) : (
          <DashboardContent
            inProgress={inProgress.slice(0, 2)}
            recent={recent.slice(0, 6)}
            pending={pending}
            uploading={uploading}
            onUpload={upload}
            onOpen={(doc) => router.push(`/read/${doc.id}`)}
            onMore={openKebab}
          />
        )}
      </ScrollView>

      <BottomTabs bottom={insets.bottom} onUpload={upload} />

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
        <View style={[styles.toastWrap, { bottom: insets.bottom + 78 }]}>
          <Toast iconStart={<Icons.Check size={18} color={color.status.success} />}>{toast}</Toast>
        </View>
      )}
    </View>
  );
}

function DashboardHeader({
  reader,
  searchOpen,
  query,
  onQuery,
  onToggleSearch,
}: {
  reader: string;
  searchOpen: boolean;
  query: string;
  onQuery: (value: string) => void;
  onToggleSearch: () => void;
}) {
  return (
    <View>
      <View style={styles.nav}>
        <Wordmark size="sm" />
        <View style={styles.navActions}>
          <Pressable accessibilityRole="button" onPress={onToggleSearch} style={styles.iconButton}>
            <Icons.Search size={16} color={color.paper[800]} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => authClient.signOut()}
            style={styles.iconButton}
          >
            <Icons.User size={16} color={color.paper[800]} />
          </Pressable>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search across everything..."
            value={query}
            onChangeText={onQuery}
            iconStart={<Icons.Search size={16} color={color.paper[500]} />}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>{dayLabel()}</Text>
        <Text style={styles.title}>
          Good evening,{"\n"}
          {reader}.
        </Text>
      </View>
    </View>
  );
}

function DashboardLoading() {
  return (
    <View style={styles.loading}>
      <Skeleton width="100%" height={52} />
      <Skeleton width="100%" height={102} />
      <Skeleton width="100%" height={102} />
      <Skeleton width="72%" height={118} />
    </View>
  );
}

function DashboardContent({
  inProgress,
  recent,
  pending,
  uploading,
  onUpload,
  onOpen,
  onMore,
}: {
  inProgress: Document[];
  recent: Document[];
  pending: Document[];
  uploading: boolean;
  onUpload: () => void;
  onOpen: (doc: Document) => void;
  onMore: (doc: Document) => void;
}) {
  return (
    <View>
      <QuickAdd uploading={uploading} onPress={onUpload} />

      {pending.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Processing" meta={`${pending.length} queued`} />
          <View style={styles.stack}>
            {pending.slice(0, 2).map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Pick up where you left off" meta="See all" />
        <View style={styles.stack}>
          {inProgress.length > 0 ? (
            inProgress.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onPress={() => onOpen(doc)}
                onMore={() => onMore(doc)}
              />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                Open a document and Bainder will keep your place here.
              </Text>
            </Card>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your collections</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collections}
        >
          <CollectionCard name="Processed" count={recent.length} dot={color.highlight.green} />
          <CollectionCard name="In progress" count={pending.length} dot={color.highlight.yellow} />
          <CollectionCard name="Book notes" count={0} dot={color.highlight.pink} />
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recently added" meta={`${recent.length} items`} />
        <View style={styles.recentGrid}>
          {recent.map((doc) => (
            <RecentCard
              key={doc.id}
              doc={doc}
              onPress={() => onOpen(doc)}
              onMore={() => onMore(doc)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function DropDashboard({ uploading, onUpload }: { uploading: boolean; onUpload: () => void }) {
  return (
    <View style={styles.dropWrap}>
      <View style={styles.dropZone}>
        <View style={[styles.faintCover, styles.faintCoverLeft]}>
          <Text style={styles.faintCoverText}>The Book of Art</Text>
        </View>
        <View
          style={[
            styles.faintCover,
            styles.faintCoverRight,
            { backgroundColor: color.highlight.pink },
          ]}
        >
          <Text style={styles.faintCoverText}>Ladybird</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onUpload}
          disabled={uploading}
          style={styles.dropIcon}
        >
          <Icons.Plus size={20} color={color.paper[800]} />
        </Pressable>
        <Text style={styles.dropTitle}>Add anything to read</Text>
        <Text style={styles.dropLead}>EPUB files today. PDF, articles, and links are next.</Text>

        <Pressable accessibilityRole="button" onPress={onUpload} style={styles.linkImport}>
          <Text style={styles.linkPlaceholder}>Paste a link soon...</Text>
          <View style={styles.linkButton}>
            <Text style={styles.linkButtonText}>{uploading ? "..." : "Go"}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.dropHints}>
        <ImportHint icon={Icons.BookOpen} label="From your device" />
        <ImportHint icon={Icons.Sparkles} label="Grounded answers" />
        <ImportHint icon={Icons.Note} label="Connected notes" />
      </View>
    </View>
  );
}

function FilteredEmpty({ query }: { query: string }) {
  return (
    <Card style={styles.filteredEmpty}>
      <Icons.Search size={24} color={color.paper[500]} />
      <Text style={styles.filteredTitle}>No matches</Text>
      <Text style={styles.filteredBody}>{`Nothing matches "${query}".`}</Text>
    </Card>
  );
}

function QuickAdd({ uploading, onPress }: { uploading: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={uploading}
      style={({ pressed }) => [styles.quickAdd, pressed ? styles.pressed : null]}
    >
      <Icons.Plus size={16} color={color.paper[700]} />
      <Text style={styles.quickAddText} numberOfLines={1}>
        Add an EPUB or import something new
      </Text>
      <Chip variant="outline">{uploading ? "Uploading" : "Browse"}</Chip>
    </Pressable>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

function DocumentRow({
  doc,
  onPress,
  onMore,
}: {
  doc: Document;
  onPress?: () => void;
  onMore?: () => void;
}) {
  const subtitle = progressLabel(doc) ?? doc.originalFilename;
  return (
    <Card style={styles.documentRow} onPress={doc.status === "processed" ? onPress : undefined}>
      <DocumentCover doc={doc} width={46} height={62} />
      <View style={styles.documentBody}>
        <Text style={styles.kindLabel}>{KIND_LABEL[doc.kind]}</Text>
        <Text style={styles.documentTitle} numberOfLines={1}>
          {doc.title}
        </Text>
        <Text style={styles.documentSub} numberOfLines={1}>
          {doc.status === "failed" ? (doc.errorReason ?? "Failed") : subtitle}
        </Text>
        <ProgressLine doc={doc} />
      </View>
      {doc.status === "processed" && onMore ? (
        <IconButton aria-label="More actions" size="sm" onPress={onMore}>
          <Icons.MoreVertical size={16} color={color.paper[700]} />
        </IconButton>
      ) : null}
    </Card>
  );
}

function RecentCard({
  doc,
  onPress,
  onMore,
}: {
  doc: Document;
  onPress: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.recentCard}>
      <Pressable accessibilityRole="button" onPress={onPress}>
        <DocumentCover doc={doc} width={94} height={142} />
      </Pressable>
      <View style={styles.recentTextRow}>
        <View style={styles.recentText}>
          <Text style={styles.recentTitle} numberOfLines={2}>
            {doc.title}
          </Text>
          <Text style={styles.recentSub} numberOfLines={1}>
            {formatRelativeTime(doc.createdAt)}
          </Text>
        </View>
        <IconButton aria-label="More actions" size="sm" onPress={onMore}>
          <Icons.MoreVertical size={14} color={color.paper[600]} />
        </IconButton>
      </View>
    </View>
  );
}

function CollectionCard({ name, count, dot }: { name: string; count: number; dot: string }) {
  return (
    <View style={styles.collectionCard}>
      <View style={[styles.collectionDot, { backgroundColor: dot }]} />
      <Text style={styles.collectionName}>{name}</Text>
      <Text style={styles.collectionCount}>{count} items</Text>
    </View>
  );
}

function ImportHint({ icon: Icon, label }: { icon: typeof Icons.BookOpen; label: string }) {
  return (
    <View style={styles.importHint}>
      <Icon size={14} color={color.paper[600]} />
      <Text style={styles.importHintText}>{label}</Text>
    </View>
  );
}

function ProgressLine({ doc }: { doc: Document }) {
  const progress = doc.progress ? Math.min(92, 18 + doc.progress.epubChapterOrder * 7) : 12;
  const status = doc.status === "processed" ? progress : doc.status === "failed" ? 100 : 42;
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${status}%`,
            backgroundColor: doc.status === "failed" ? color.status.error : color.paper[900],
          },
        ]}
      />
    </View>
  );
}

function BottomTabs({ bottom, onUpload }: { bottom: number; onUpload: () => void }) {
  const tabs = [
    { icon: Icons.Home, name: "Home", active: true },
    { icon: Icons.Library, name: "Library" },
    { icon: Icons.Plus, name: "Add", primary: true, onPress: onUpload },
    { icon: Icons.Sparkles, name: "Ask" },
    { icon: Icons.User, name: "You", onPress: () => authClient.signOut() },
  ];
  return (
    <View style={[styles.tabs, { paddingBottom: bottom + 10 }]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.name}
          accessibilityRole="button"
          onPress={tab.onPress}
          style={styles.tabItem}
        >
          {tab.primary ? (
            <View style={styles.primaryTab}>
              <tab.icon size={20} color={color.paper[50]} />
            </View>
          ) : (
            <tab.icon
              size={22}
              color={tab.active ? color.paper[900] : color.paper[500]}
              strokeWidth={tab.active ? 2 : 1.5}
            />
          )}
          <Text style={[styles.tabLabel, tab.active ? styles.tabLabelActive : null]}>
            {tab.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function DocumentCover({ doc, width, height }: { doc: Document; width: number; height: number }) {
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
      width={width}
      height={height}
      src={coverSrc ?? undefined}
      backgroundColor={KIND_BG[doc.kind]}
      alt=""
    />
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
              {saving ? "Saving..." : "Save"}
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
            <Text style={styles.modalStrong}>{`"${doc.title}"`}</Text>
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
              {working ? "Deleting..." : "Delete"}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.paper[50],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.paper[100],
  },
  searchWrap: {
    marginTop: 14,
  },
  greeting: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  eyebrow: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.44,
    color: color.paper[500],
  },
  title: {
    marginTop: 4,
    fontFamily: font.nativeFamily.display,
    fontSize: 30,
    fontWeight: "400",
    lineHeight: 32,
    letterSpacing: 0,
    color: color.paper[900],
  },
  error: {
    marginTop: 12,
    borderRadius: radius.md,
    backgroundColor: color.wine[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    color: color.status.error,
  },
  loading: {
    marginTop: 18,
    gap: 12,
  },
  quickAdd: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.pill,
    backgroundColor: color.paper[100],
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickAddText: {
    flex: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    color: color.paper[500],
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: font.nativeFamily.display,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 22,
    color: color.paper[900],
  },
  sectionMeta: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    color: color.paper[500],
  },
  stack: {
    gap: 8,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  documentBody: {
    flex: 1,
    minWidth: 0,
  },
  kindLabel: {
    marginBottom: 2,
    fontFamily: font.nativeFamily.ui,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.36,
    color: color.paper[500],
  },
  documentTitle: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
    color: color.paper[900],
  },
  documentSub: {
    marginTop: 2,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    lineHeight: 15,
    color: color.paper[500],
  },
  progressTrack: {
    marginTop: 8,
    height: 3,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: color.paper[200],
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  emptyCard: {
    padding: 18,
  },
  emptyCardText: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    lineHeight: 18,
    color: color.paper[600],
  },
  collections: {
    gap: 10,
    paddingTop: 8,
    paddingRight: 24,
  },
  collectionCard: {
    width: 132,
    borderRadius: radius.lg,
    backgroundColor: color.paper[100],
    padding: 14,
  },
  collectionDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  collectionName: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 16,
    color: color.paper[900],
  },
  collectionCount: {
    marginTop: 4,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
  },
  recentGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  recentCard: {
    width: 104,
  },
  recentTextRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  recentText: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 15,
    color: color.paper[900],
  },
  recentSub: {
    marginTop: 2,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
  },
  dropWrap: {
    marginTop: 16,
  },
  dropZone: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: color.paper[300],
    borderRadius: 22,
    backgroundColor: color.paper[100],
    padding: 24,
  },
  faintCover: {
    position: "absolute",
    width: 58,
    height: 82,
    justifyContent: "flex-end",
    borderRadius: 4,
    backgroundColor: color.highlight.blue,
    opacity: 0.2,
    padding: 8,
  },
  faintCoverLeft: {
    left: 20,
    top: 32,
    transform: [{ rotate: "-9deg" }],
  },
  faintCoverRight: {
    right: 22,
    bottom: 42,
    transform: [{ rotate: "6deg" }],
  },
  faintCoverText: {
    fontFamily: font.nativeFamily.display,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    color: color.paper[900],
  },
  dropIcon: {
    zIndex: 1,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.paper[50],
    shadowColor: color.paper[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  dropTitle: {
    zIndex: 1,
    marginTop: 14,
    textAlign: "center",
    fontFamily: font.nativeFamily.display,
    fontSize: 18,
    fontWeight: "500",
    color: color.paper[900],
  },
  dropLead: {
    zIndex: 1,
    marginTop: 4,
    textAlign: "center",
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    lineHeight: 17,
    color: color.paper[700],
  },
  linkImport: {
    zIndex: 1,
    marginTop: 14,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.paper[300],
    borderRadius: radius.pill,
    backgroundColor: color.paper[50],
    padding: 4,
  },
  linkPlaceholder: {
    flex: 1,
    paddingLeft: 12,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
  },
  linkButton: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.paper[900],
    paddingHorizontal: 14,
  },
  linkButtonText: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    color: color.paper[50],
  },
  dropHints: {
    marginTop: 14,
    gap: 8,
  },
  importHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  importHintText: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    color: color.paper[600],
  },
  filteredEmpty: {
    marginTop: 24,
    alignItems: "center",
    padding: 28,
  },
  filteredTitle: {
    marginTop: 12,
    fontFamily: font.nativeFamily.display,
    fontSize: 22,
    fontWeight: "500",
    color: color.paper[900],
  },
  filteredBody: {
    marginTop: 4,
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    color: color.paper[600],
  },
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: color.paper[200],
    backgroundColor: color.paper[50],
    paddingTop: 12,
  },
  tabItem: {
    minWidth: 52,
    alignItems: "center",
    gap: 4,
  },
  primaryTab: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.paper[900],
  },
  tabLabel: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 10,
    color: color.paper[500],
  },
  tabLabelActive: {
    color: color.paper[900],
    fontWeight: "600",
  },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20,15,10,0.35)",
  },
  modalSheet: {
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: color.paper[50],
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 17,
    fontWeight: "500",
    color: color.paper[900],
  },
  modalBody: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    lineHeight: 22,
    color: color.paper[700],
  },
  modalStrong: {
    fontWeight: "600",
  },
  modalFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
