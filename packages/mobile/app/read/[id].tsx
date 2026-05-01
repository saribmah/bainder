import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  FloatingToolbar,
  FloatingToolbarButton,
  IconButton,
  Icons,
  Sheet,
  Skeleton,
  ThemeProvider,
  color,
  themeColors,
  useTheme,
  type Theme,
} from "@bainder/ui";
import type {
  Document,
  EpubChapter,
  EpubChapterSummary,
  EpubDetail,
  EpubTocItem,
} from "@bainder/sdk";
import { useSdk } from "../../src/sdk/sdk.provider.tsx";
import { EpubHtmlBody } from "../../src/reader/EpubHtmlBody.tsx";
import type { AssetCache } from "../../src/reader/inlineAssets.ts";
import { useReaderHighlights } from "../../src/reader/useReaderHighlights.ts";
import { NotesSheet } from "../../src/reader/NotesSheet.tsx";

type NotesContext = {
  chapters?: ReadonlyArray<EpubChapterSummary>;
  currentOrder?: number;
  refreshToken: number;
  onJumpEpub?: (order: number) => void;
};

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client } = useSdk();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    client.document
      .get({ id })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setDoc(res.data);
        else setError("Document not found");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id, client]);

  const handleClose = useCallback(() => router.replace("/library"), [router]);

  if (error) {
    return (
      <ReaderState>
        <Text style={shellStyles.errorText}>{error}</Text>
        <Button variant="secondary" onPress={handleClose}>
          Back to library
        </Button>
      </ReaderState>
    );
  }

  if (!doc) {
    return (
      <ReaderState>
        <ChapterSkeleton />
      </ReaderState>
    );
  }

  if (doc.status !== "processed") {
    return (
      <ReaderState>
        <Text style={shellStyles.muted}>
          {doc.status === "failed"
            ? (doc.errorReason ?? "Processing failed.")
            : "This document is still being processed. Please wait a moment and try again."}
        </Text>
        <Button variant="secondary" onPress={handleClose}>
          Back to library
        </Button>
      </ReaderState>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <ReaderShell doc={doc} onClose={handleClose} />
    </ThemeProvider>
  );
}

function ReaderShell({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme, cycleTheme } = useTheme();
  const palette = themeColors(theme);
  const [position, setPosition] = useState<string | null>(null);
  const [tocState, setTocState] = useState<{
    toc: ReadonlyArray<EpubTocItem>;
    chapters: ReadonlyArray<EpubChapterSummary>;
    currentOrder: number;
    onJump: (order: number) => void;
  } | null>(null);
  const [notesState, setNotesState] = useState<NotesContext | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <View style={[shellStyles.root, { backgroundColor: palette.surface }]}>
      <View
        style={[
          shellStyles.header,
          { paddingTop: insets.top + 8, borderBottomColor: borderForTheme(theme) },
        ]}
      >
        <IconButton aria-label="Close" size="sm" onPress={onClose}>
          <Icons.Close size={16} color={palette.text} />
        </IconButton>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[shellStyles.title, { color: palette.text }]} numberOfLines={1}>
            {doc.title}
          </Text>
          {position && (
            <Text style={[shellStyles.position, { color: mutedForTheme(theme) }]} numberOfLines={1}>
              {position}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={shellStyles.body}
        contentContainerStyle={[shellStyles.bodyContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <EpubBody
          documentId={doc.id}
          initialOrder={doc.progress?.epubChapterOrder ?? 0}
          theme={theme}
          onPosition={setPosition}
          onTocChange={setTocState}
          onNotesChange={setNotesState}
        />
      </ScrollView>

      <View style={[shellStyles.toolbarWrap, { bottom: insets.bottom + 16 }]}>
        <FloatingToolbar style={{ backgroundColor: floatingBgForTheme(theme) }}>
          {tocState && (
            <FloatingToolbarButton aria-label="Table of contents" onPress={() => setTocOpen(true)}>
              <Icons.List size={20} color={palette.text} />
            </FloatingToolbarButton>
          )}
          {notesState && (
            <FloatingToolbarButton aria-label="Notes" onPress={() => setNotesOpen(true)}>
              <Icons.Note size={20} color={palette.text} />
            </FloatingToolbarButton>
          )}
          <FloatingToolbarButton aria-label={`Theme: ${theme}`} onPress={cycleTheme}>
            {theme === "dark" ? (
              <Icons.Sun size={20} color={palette.text} />
            ) : (
              <Icons.Moon size={20} color={palette.text} />
            )}
          </FloatingToolbarButton>
        </FloatingToolbar>
      </View>

      {tocState && (
        <TocSheet
          visible={tocOpen}
          onClose={() => setTocOpen(false)}
          toc={tocState.toc}
          chapters={tocState.chapters}
          currentOrder={tocState.currentOrder}
          onJump={(order) => {
            tocState.onJump(order);
            setTocOpen(false);
          }}
          theme={theme}
        />
      )}

      {notesState && (
        <NotesSheet
          visible={notesOpen}
          onClose={() => setNotesOpen(false)}
          documentId={doc.id}
          theme={theme}
          chapters={notesState.chapters}
          currentOrder={notesState.currentOrder}
          refreshToken={notesState.refreshToken}
          onJumpEpub={(order) => {
            notesState.onJumpEpub?.(order);
            setNotesOpen(false);
          }}
        />
      )}
    </View>
  );
}

// ─── EPUB body ──────────────────────────────────────────────────────────
function EpubBody({
  documentId,
  initialOrder,
  theme,
  onPosition,
  onTocChange,
  onNotesChange,
}: {
  documentId: string;
  initialOrder: number;
  theme: Theme;
  onPosition: (p: string | null) => void;
  onTocChange: (
    s: {
      toc: ReadonlyArray<EpubTocItem>;
      chapters: ReadonlyArray<EpubChapterSummary>;
      currentOrder: number;
      onJump: (order: number) => void;
    } | null,
  ) => void;
  onNotesChange: (s: NotesContext | null) => void;
}) {
  const { client, baseUrl, authedFetch } = useSdk();
  const [order, setOrder] = useState(Math.max(0, initialOrder));
  const [detail, setDetail] = useState<EpubDetail | null>(null);
  const [chapter, setChapter] = useState<EpubChapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assetCacheRef = useRef<AssetCache>(new Map());

  const highlightLayer = useReaderHighlights({
    client,
    documentId,
    chapterOrder: order,
    enabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    client.document
      .getEpubDetail({ id: documentId })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setDetail(res.data);
        else setError("Failed to load book details");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId]);

  useEffect(() => {
    let cancelled = false;
    setChapter(null);
    client.document
      .getEpubChapter({ id: documentId, order: String(order) })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setChapter(res.data);
        else setError("Failed to load chapter");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, order]);

  // Persist progress after the user stabilizes on a chapter for ~1s.
  useEffect(() => {
    const handle = setTimeout(() => {
      client.progress.upsert({ id: documentId, epubChapterOrder: order }).catch(() => undefined);
    }, 1000);
    return () => clearTimeout(handle);
  }, [client, documentId, order]);

  // Publish position label.
  useEffect(() => {
    if (!detail) return;
    onPosition(`Chapter ${order + 1} of ${detail.chapters.length}`);
    return () => onPosition(null);
  }, [detail, order, onPosition]);

  // Publish TOC for the floating toolbar.
  useEffect(() => {
    if (!detail || detail.toc.length === 0) {
      onTocChange(null);
      return;
    }
    onTocChange({
      toc: detail.toc,
      chapters: detail.chapters,
      currentOrder: order,
      onJump: (next) => setOrder(next),
    });
    return () => onTocChange(null);
  }, [detail, order, onTocChange]);

  // Publish notes context. The refresh token is the highlights array length
  // plus a hash of the latest update timestamp so NotesSheet reloads after CRUD.
  const refreshToken = useMemo(() => {
    let token = highlightLayer.highlights.length;
    for (const h of highlightLayer.highlights) {
      token += new Date(h.updatedAt).getTime();
    }
    return token;
  }, [highlightLayer.highlights]);

  useEffect(() => {
    if (!detail) {
      onNotesChange(null);
      return;
    }
    onNotesChange({
      chapters: detail.chapters,
      currentOrder: order,
      refreshToken,
      onJumpEpub: (next) => setOrder(next),
    });
    return () => onNotesChange(null);
  }, [detail, order, refreshToken, onNotesChange]);

  if (error) return <Text style={shellStyles.errorText}>{error}</Text>;
  if (!detail || !chapter) return <ChapterSkeleton />;

  const totalChapters = detail.chapters.length;

  return (
    <>
      <Text style={[shellStyles.chapterTitle, { color: themeColors(theme).text }]}>
        {chapter.title}
      </Text>
      <EpubHtmlBody
        html={chapter.html}
        assetBase={`${baseUrl}/documents/${documentId}/`}
        theme={theme}
        contentKey={`${documentId}:${order}`}
        highlights={highlightLayer.highlights}
        authedFetch={authedFetch}
        assetCache={assetCacheRef.current}
        onCreateHighlight={highlightLayer.create}
        onUpdateHighlight={highlightLayer.update}
        onRemoveHighlight={highlightLayer.remove}
      />
      <ChapterNav
        canPrev={order > 0}
        canNext={order < totalChapters - 1}
        onPrev={() => setOrder(order - 1)}
        onNext={() => setOrder(order + 1)}
        prevLabel="Previous chapter"
        nextLabel="Next chapter"
      />
    </>
  );
}

// ─── Chapter navigation row ─────────────────────────────────────────────
function ChapterNav({
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <View style={shellStyles.nav}>
      <Button variant="secondary" disabled={!canPrev} onPress={onPrev}>
        {`← ${prevLabel}`}
      </Button>
      <Button variant="secondary" disabled={!canNext} onPress={onNext}>
        {`${nextLabel} →`}
      </Button>
    </View>
  );
}

function ChapterSkeleton() {
  return (
    <View style={{ gap: 8 }}>
      <Skeleton width="70%" height={32} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="96%" height={14} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="88%" height={14} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="62%" height={14} />
    </View>
  );
}

// ─── TOC sheet ──────────────────────────────────────────────────────────
function TocSheet({
  visible,
  onClose,
  toc,
  chapters,
  currentOrder,
  onJump,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  toc: ReadonlyArray<EpubTocItem>;
  chapters: ReadonlyArray<EpubChapterSummary>;
  currentOrder: number;
  onJump: (order: number) => void;
  theme: Theme;
}) {
  const orderByFile = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of chapters) {
      if (!map.has(ch.href)) map.set(ch.href, ch.order);
    }
    return map;
  }, [chapters]);

  const palette = themeColors(theme);
  const muted = mutedForTheme(theme);

  return (
    <Sheet visible={visible} onClose={onClose} style={{ backgroundColor: palette.surface }}>
      <View style={tocStyles.header}>
        <Text style={[tocStyles.title, { color: palette.text }]}>Contents</Text>
        <IconButton aria-label="Close" size="sm" onPress={onClose}>
          <Icons.Close size={14} color={palette.text} />
        </IconButton>
      </View>
      <ScrollView style={{ maxHeight: 480 }}>
        {toc.map((item) => {
          const order = orderByFile.get(item.fileHref);
          const reachable = order !== undefined;
          const active = reachable && order === currentOrder;
          return (
            <Button
              key={`${item.index}-${item.href}`}
              variant="ghost"
              shape="rounded"
              fullWidth
              disabled={!reachable}
              onPress={() => {
                if (reachable && order !== undefined) onJump(order);
              }}
              style={[
                {
                  justifyContent: "flex-start",
                  paddingLeft: 12 + item.depth * 16,
                  height: undefined,
                  paddingVertical: 10,
                },
                active && { backgroundColor: activeBgForTheme(theme) },
              ]}
            >
              <Text
                style={{
                  color: reachable ? palette.text : muted,
                  fontSize: 15,
                  flex: 1,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </Button>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

function ReaderState({ children }: { children: React.ReactNode }) {
  return (
    <View style={shellStyles.stateRoot}>
      <View style={{ gap: 16, padding: 24, alignItems: "center" }}>{children}</View>
    </View>
  );
}

// ─── Theme helpers ──────────────────────────────────────────────────────
function borderForTheme(theme: Theme): string {
  if (theme === "dark") return color.night[800];
  if (theme === "sepia") return color.sepia[200];
  return color.paper[200];
}

function mutedForTheme(theme: Theme): string {
  if (theme === "dark") return color.night[200];
  if (theme === "sepia") return color.sepia[700];
  return color.paper[500];
}

function floatingBgForTheme(theme: Theme): string {
  if (theme === "dark") return color.night[800];
  if (theme === "sepia") return color.sepia[50];
  return color.paper[50];
}

function activeBgForTheme(theme: Theme): string {
  if (theme === "dark") return color.night[800];
  if (theme === "sepia") return color.sepia[100];
  return color.paper[100];
}

const shellStyles = StyleSheet.create({
  root: { flex: 1 },
  stateRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.paper[50],
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 15, fontWeight: "500" },
  position: { marginTop: 2, fontSize: 13 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 24 },
  chapterTitle: {
    fontSize: 28,
    fontWeight: "500",
    marginBottom: 24,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  readingText: {
    fontSize: 19,
    lineHeight: 31,
  },
  nav: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  toolbarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  errorText: { fontSize: 15, color: color.status.error },
  muted: { fontSize: 15, color: color.paper[500] },
});

const tocStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  title: { fontSize: 15, fontWeight: "500" },
});
