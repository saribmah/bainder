import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  font,
  themeColors,
  useTheme,
  type Theme,
} from "@bainder/ui";
import type { Document, DocumentManifest, DocumentSectionSummary, EpubTocItem } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider.tsx";
import { EpubHtmlBody } from "../EpubHtmlBody.tsx";
import type { AssetCache } from "../inlineAssets.ts";
import { NotesSheet } from "../NotesSheet.tsx";
import { useReaderHighlights } from "../useReaderHighlights.ts";

type NotesContext = {
  sections?: ReadonlyArray<DocumentSectionSummary>;
  currentOrder?: number;
  refreshToken: number;
  onJumpToOrder?: (order: number) => void;
};

type TocContext = {
  toc: ReadonlyArray<EpubTocItem>;
  sections: ReadonlyArray<DocumentSectionSummary>;
  currentOrder: number;
  onJump: (order: number) => void;
};

type ReaderFontScale = "standard" | "large";

export function ReaderScreen() {
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

  const handleClose = useCallback(() => router.replace("/dashboard"), [router]);

  if (error) {
    return (
      <ReaderState>
        <Text style={shellStyles.errorText}>{error}</Text>
        <Button variant="secondary" onPress={handleClose}>
          Back to dashboard
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
          Back to dashboard
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
  const [tocState, setTocState] = useState<TocContext | null>(null);
  const [notesState, setNotesState] = useState<NotesContext | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [fontScale, setFontScale] = useState<ReaderFontScale>("standard");

  const toggleFontScale = useCallback(() => {
    setFontScale((curr) => (curr === "standard" ? "large" : "standard"));
  }, []);

  return (
    <View style={[shellStyles.root, { backgroundColor: palette.bg }]}>
      <View
        style={[
          shellStyles.header,
          { paddingTop: insets.top + 8, borderBottomColor: borderForTheme(theme) },
        ]}
      >
        <IconButton aria-label="Close reader" size="sm" onPress={onClose}>
          <Icons.Close size={16} color={palette.text} />
        </IconButton>
        <Text style={[shellStyles.title, { color: palette.text }]} numberOfLines={1}>
          {doc.title}
        </Text>
        {position && (
          <Text style={[shellStyles.position, { color: mutedForTheme(theme) }]} numberOfLines={1}>
            {position}
          </Text>
        )}
      </View>

      <ScrollView
        style={shellStyles.body}
        contentContainerStyle={[shellStyles.bodyContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <ReaderBody
          doc={doc}
          theme={theme}
          onPosition={setPosition}
          onTocChange={setTocState}
          onNotesChange={setNotesState}
          fontScale={fontScale}
        />
      </ScrollView>

      <View style={[shellStyles.toolbarWrap, { bottom: insets.bottom + 24 }]}>
        <FloatingToolbar style={{ backgroundColor: floatingBgForTheme(theme) }}>
          <FloatingToolbarButton aria-label={`Theme: ${theme}`} onPress={cycleTheme}>
            {theme === "dark" ? (
              <Icons.Sun size={20} color={palette.text} />
            ) : (
              <Icons.Moon size={20} color={palette.text} />
            )}
          </FloatingToolbarButton>
          <FloatingToolbarButton
            aria-label="Table of contents"
            disabled={!tocState}
            onPress={() => setTocOpen(true)}
          >
            <Icons.BookOpen size={20} color={palette.text} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Ask Bainder" onPress={() => setAiOpen(true)}>
            <Icons.Headphones size={20} color={palette.text} />
          </FloatingToolbarButton>
          <FloatingToolbarButton
            aria-label={
              fontScale === "standard" ? "Use larger reader type" : "Use standard reader type"
            }
            onPress={toggleFontScale}
          >
            <Icons.Type size={20} color={palette.text} />
          </FloatingToolbarButton>
          <FloatingToolbarButton
            aria-label="Notes"
            disabled={!notesState}
            onPress={() => setNotesOpen(true)}
          >
            <Icons.Settings size={20} color={palette.text} />
          </FloatingToolbarButton>
        </FloatingToolbar>
      </View>

      {tocState && (
        <TocSheet
          visible={tocOpen}
          onClose={() => setTocOpen(false)}
          toc={tocState.toc}
          sections={tocState.sections}
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
          sections={notesState.sections}
          currentOrder={notesState.currentOrder}
          refreshToken={notesState.refreshToken}
          onJumpToOrder={(order) => {
            notesState.onJumpToOrder?.(order);
            setNotesOpen(false);
          }}
        />
      )}

      <ReaderAiSheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        theme={theme}
        chapterLabel={position ?? "Current chapter"}
      />
    </View>
  );
}

// ─── Reader body ─────────────────────────────────────────────────────────
function ReaderBody({
  doc,
  theme,
  onPosition,
  onTocChange,
  onNotesChange,
  fontScale,
}: {
  doc: Document;
  theme: Theme;
  onPosition: (p: string | null) => void;
  onTocChange: (s: TocContext | null) => void;
  onNotesChange: (s: NotesContext | null) => void;
  fontScale: ReaderFontScale;
}) {
  const { client, baseUrl, authedFetch } = useSdk();
  const documentId = doc.id;
  const initialOrder = doc.progress?.sectionKey
    ? (parseSectionOrder(doc.progress.sectionKey) ?? 0)
    : 0;
  const [order, setOrder] = useState(Math.max(0, initialOrder));
  const [manifest, setManifest] = useState<DocumentManifest | null>(null);
  const [chapterHtml, setChapterHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assetCacheRef = useRef<AssetCache>(new Map());

  const currentSection = useMemo(
    () => manifest?.sections.find((s) => s.order === order) ?? null,
    [manifest, order],
  );

  const highlightLayer = useReaderHighlights({
    client,
    documentId,
    sectionKey: currentSection?.sectionKey ?? null,
    enabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    client.document
      .getManifest({ id: documentId })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setManifest(res.data);
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
    setChapterHtml(null);
    client.document
      .getSectionHtml({ id: documentId, order: String(order) })
      .then((res) => {
        if (cancelled) return;
        if (typeof res.data === "string") setChapterHtml(res.data);
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
    if (!manifest || !currentSection) return;
    const handle = setTimeout(() => {
      const params: Parameters<typeof client.progress.upsert>[0] = {
        id: documentId,
        sectionKey: currentSection.sectionKey,
      };
      if (manifest.chapterCount > 0) {
        params.progressPercent = (order + 1) / manifest.chapterCount;
      }
      client.progress.upsert(params).catch(() => undefined);
    }, 1000);
    return () => clearTimeout(handle);
  }, [client, documentId, order, currentSection, manifest]);

  // Publish position label.
  useEffect(() => {
    if (!manifest) return;
    onPosition(`${order + 1}/${manifest.chapterCount}`);
    return () => onPosition(null);
  }, [manifest, order, onPosition]);

  // Publish TOC for the floating toolbar.
  useEffect(() => {
    if (!manifest || manifest.kind !== "epub" || manifest.toc.length === 0) {
      onTocChange(null);
      return;
    }
    onTocChange({
      toc: manifest.toc,
      sections: manifest.sections,
      currentOrder: order,
      onJump: (next) => setOrder(next),
    });
    return () => onTocChange(null);
  }, [manifest, order, onTocChange]);

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
    if (!manifest) {
      onNotesChange(null);
      return;
    }
    onNotesChange({
      sections: manifest.sections,
      currentOrder: order,
      refreshToken,
      onJumpToOrder: (next) => setOrder(next),
    });
    return () => onNotesChange(null);
  }, [manifest, order, refreshToken, onNotesChange]);

  if (error) return <Text style={shellStyles.errorText}>{error}</Text>;
  if (!manifest || chapterHtml === null || !currentSection) return <ChapterSkeleton />;

  const totalChapters = manifest.chapterCount;
  const readerFontSize = fontScale === "large" ? 19 : 17;

  return (
    <>
      <Text style={[shellStyles.chapterKicker, { color: themeColors(theme).text }]}>
        Chapter {String(order + 1).padStart(2, "0")}
      </Text>
      <Text style={[shellStyles.chapterTitle, { color: themeColors(theme).text }]}>
        {currentSection.title}
      </Text>
      <EpubHtmlBody
        html={chapterHtml}
        assetBase={`${baseUrl}/documents/${documentId}/`}
        theme={theme}
        fontSize={readerFontSize}
        contentKey={currentSection.sectionKey}
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
  sections,
  currentOrder,
  onJump,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  toc: ReadonlyArray<EpubTocItem>;
  sections: ReadonlyArray<DocumentSectionSummary>;
  currentOrder: number;
  onJump: (order: number) => void;
  theme: Theme;
}) {
  const orderByFile = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of sections) {
      if (!map.has(ch.href)) map.set(ch.href, ch.order);
    }
    return map;
  }, [sections]);

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

function ReaderAiSheet({
  visible,
  onClose,
  theme,
  chapterLabel,
}: {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  chapterLabel: string;
}) {
  const palette = themeColors(theme);
  const muted = mutedForTheme(theme);
  return (
    <Sheet visible={visible} onClose={onClose} style={{ backgroundColor: palette.bg }}>
      <View style={aiStyles.header}>
        <View style={aiStyles.brandRow}>
          <Icons.Sparkles size={18} color={palette.accent} />
          <Text style={[aiStyles.brand, { color: palette.accent }]}>Bainder</Text>
        </View>
        <Text style={[aiStyles.chapter, { color: muted }]}>{chapterLabel}</Text>
      </View>
      <View style={[aiStyles.quote, { backgroundColor: palette.surfaceRaised }]}>
        <Text style={[aiStyles.quoteText, { color: palette.fgSubtle }]}>
          "Affordances define what actions are possible. Signifiers specify how people discover
          those possibilities."
        </Text>
      </View>
      <View style={aiStyles.promptRow}>
        <View style={[aiStyles.promptBubble, { backgroundColor: palette.action }]}>
          <Text style={[aiStyles.promptText, { color: palette.actionFg }]}>
            What's the difference between these two terms?
          </Text>
        </View>
      </View>
      <Text style={[aiStyles.answer, { color: palette.fgSubtle }]}>
        Norman is drawing a careful line. An affordance is what is possible. A signifier is the
        visible cue that tells you that possibility exists.
      </Text>
      <View style={aiStyles.chips}>
        {["Give me an example", "Why does this matter?", "Save to notes"].map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            style={[aiStyles.chip, { borderColor: palette.borderStrong }]}
          >
            <Text style={[aiStyles.chipText, { color: palette.fgSubtle }]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[aiStyles.inputRow, { backgroundColor: palette.surfaceRaised }]}>
        <TextInput
          placeholder="Ask a follow-up..."
          placeholderTextColor={muted}
          style={[aiStyles.input, { color: palette.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={[aiStyles.send, { backgroundColor: palette.action }]}
        >
          <Icons.Send size={14} color={palette.actionFg} />
        </Pressable>
      </View>
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

// Section keys mint as `${kind}:section:${order}`. The dashboard / progress
// UI reads the order back out of the stored key without a manifest fetch.
const parseSectionOrder = (sectionKey: string): number | null => {
  const match = /:section:(\d+)$/.exec(sectionKey);
  if (!match) return null;
  return Number(match[1]);
};

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
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    fontWeight: "500",
  },
  position: {
    fontFamily: font.nativeFamily.mono,
    fontSize: 12,
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 24, paddingTop: 28 },
  chapterKicker: {
    fontFamily: font.nativeFamily.display,
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 27,
    marginBottom: 8,
    textAlign: "center",
  },
  chapterTitle: {
    fontFamily: font.nativeFamily.display,
    fontSize: 22,
    fontWeight: "400",
    marginBottom: 28,
    lineHeight: 27,
    textAlign: "center",
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

const aiStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brand: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    fontWeight: "500",
  },
  chapter: {
    flexShrink: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: color.wine[700],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  quoteText: {
    fontFamily: font.nativeFamily.reading,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
  },
  promptRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  promptBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  promptText: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 14,
    lineHeight: 20,
  },
  answer: {
    fontFamily: font.nativeFamily.reading,
    fontSize: 15,
    lineHeight: 23,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: 6,
  },
  input: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
