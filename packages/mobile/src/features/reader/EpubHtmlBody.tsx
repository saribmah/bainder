import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import {
  Button,
  IconButton,
  Icons,
  SelectionToolbar,
  Sheet,
  color,
  themeColors,
  type HighlightColor,
  type Theme,
} from "@bainder/ui";
import type { Highlight, Note } from "@bainder/sdk";
import { useProfile } from "../profile";
import { buildEpubHtml } from "./buildEpubHtml.ts";
import { inlineEpubAssets, type AssetCache } from "./inlineAssets.ts";
import type { ReaderHighlights } from "./useReaderHighlights.ts";

type Rect = { top: number; left: number; width: number; height: number };

type SelectionState = {
  rect: Rect;
  charRange: { start: number; end: number };
  text: string;
};

type WebMessage =
  | { type: "ready" }
  | { type: "height"; value: number }
  | { type: "selection"; cleared: true }
  | { type: "selection"; rect: Rect; charRange: { start: number; end: number }; text: string }
  | { type: "tap-highlight"; id: string; rect: Rect };

const TOOLBAR_HEIGHT = 58;
const TOOLBAR_WIDTH = 206;
const TOOLBAR_MARGIN = 8;

export type EpubHtmlBodyProps = {
  html: string;
  assetBase: string;
  theme: Theme;
  highlights: Highlight[];
  notesByHighlightId: ReadonlyMap<string, Note>;
  fontSize?: number;
  contentKey: string;
  authedFetch: typeof fetch;
  assetCache: AssetCache;
  onCreateHighlight: ReaderHighlights["create"];
  onUpdateColor: ReaderHighlights["updateColor"];
  onSetNote: ReaderHighlights["setNoteForHighlight"];
  onRemoveHighlight: ReaderHighlights["remove"];
  onAskSelection?: (quote: string) => void;
};

export function EpubHtmlBody({
  html,
  assetBase,
  theme,
  highlights,
  notesByHighlightId,
  fontSize = 17,
  contentKey,
  authedFetch,
  assetCache,
  onCreateHighlight,
  onUpdateColor,
  onSetNote,
  onRemoveHighlight,
  onAskSelection,
}: EpubHtmlBodyProps) {
  const palette = themeColors(theme);
  const { profile } = useProfile();
  const defaultColor: HighlightColor = profile?.defaultHighlightColor ?? "pink";
  const webRef = useRef<WebView>(null);
  const [height, setHeight] = useState(400);
  const [resolvedHtml, setResolvedHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [focused, setFocused] = useState<Highlight | null>(null);
  const [noteDraft, setNoteDraft] = useState<
    { kind: "new"; selection: SelectionState } | { kind: "edit"; highlight: Highlight } | null
  >(null);

  // Inline relative <img src> assets via the authed fetch so the WebView can
  // render them without a session cookie.
  useEffect(() => {
    let cancelled = false;
    setResolvedHtml(null);
    setReady(false);
    setSelection(null);
    setFocused(null);
    inlineEpubAssets(html, assetBase, authedFetch, assetCache)
      .then((out) => {
        if (!cancelled) setResolvedHtml(out);
      })
      .catch(() => {
        if (!cancelled) setResolvedHtml(html);
      });
    return () => {
      cancelled = true;
    };
  }, [html, assetBase, authedFetch, assetCache]);

  const wrapped = useMemo(() => {
    if (resolvedHtml === null) return null;
    return buildEpubHtml(resolvedHtml, palette.bg, palette.text, fontSize);
  }, [resolvedHtml, palette.bg, palette.text, fontSize]);

  // Push highlights into the WebView once it signals ready, and again whenever
  // the highlights array changes. The injected payload carries a derived
  // `hasNote` flag so the in-page wrapper can paint the note indicator
  // without a second round trip.
  useEffect(() => {
    if (!ready) return;
    const enriched = highlights.map((h) => ({ ...h, hasNote: notesByHighlightId.has(h.id) }));
    const json = JSON.stringify(enriched);
    webRef.current?.injectJavaScript(`window.bd_setHighlights(${json}); true;`);
  }, [ready, highlights, notesByHighlightId, contentKey]);

  const clearWebSelection = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.bd_clearSelection && window.bd_clearSelection(); true;`,
    );
    setSelection(null);
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: WebMessage;
      try {
        msg = JSON.parse(e.nativeEvent.data) as WebMessage;
      } catch {
        return;
      }
      if (msg.type === "height") {
        setHeight(Math.max(100, Math.ceil(msg.value)));
        return;
      }
      if (msg.type === "ready") {
        setReady(true);
        return;
      }
      if (msg.type === "selection") {
        if ("cleared" in msg) {
          setSelection(null);
        } else {
          setSelection({ rect: msg.rect, charRange: msg.charRange, text: msg.text });
        }
        return;
      }
      if (msg.type === "tap-highlight") {
        const hit = highlights.find((h) => h.id === msg.id);
        if (hit) {
          setSelection(null);
          setFocused(hit);
        }
        return;
      }
    },
    [highlights],
  );

  const handleCopySelection = useCallback(() => {
    if (!selection) return;
    const json = JSON.stringify(selection.text);
    webRef.current?.injectJavaScript(`
      (function() {
        var value = ${json};
        function fallbackCopy() {
          var input = document.createElement('textarea');
          input.value = value;
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.focus();
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).catch(fallbackCopy);
        } else {
          fallbackCopy();
        }
        window.bd_clearSelection && window.bd_clearSelection();
      })();
      true;
    `);
    setSelection(null);
  }, [selection]);

  const handleHighlightSelection = useCallback(
    async (c: HighlightColor) => {
      if (!selection) return;
      const captured = selection;
      clearWebSelection();
      await onCreateHighlight(c, {
        offsetStart: captured.charRange.start,
        offsetEnd: captured.charRange.end,
        text: captured.text,
      });
    },
    [selection, clearWebSelection, onCreateHighlight],
  );

  const handleAskSelection = useCallback(() => {
    if (!selection) return;
    const captured = selection.text;
    onAskSelection?.(captured);
    clearWebSelection();
  }, [selection, onAskSelection, clearWebSelection]);

  const handleAddNote = useCallback(() => {
    if (!selection) return;
    const captured = selection;
    clearWebSelection();
    void onCreateHighlight(defaultColor, {
      offsetStart: captured.charRange.start,
      offsetEnd: captured.charRange.end,
      text: captured.text,
    }).then((created) => {
      if (created) setNoteDraft({ kind: "edit", highlight: created });
    });
  }, [selection, clearWebSelection, onCreateHighlight, defaultColor]);

  const handleChangeFocusedColor = useCallback(
    async (c: HighlightColor) => {
      if (!focused) return;
      await onUpdateColor(focused.id, c);
      setFocused((curr) => (curr ? { ...curr, color: c } : curr));
    },
    [focused, onUpdateColor],
  );

  const handleEditFocusedNote = useCallback(() => {
    if (!focused) return;
    setNoteDraft({ kind: "edit", highlight: focused });
    setFocused(null);
  }, [focused]);

  const handleDeleteFocused = useCallback(async () => {
    if (!focused) return;
    const id = focused.id;
    setFocused(null);
    await onRemoveHighlight(id);
  }, [focused, onRemoveHighlight]);

  const handleSaveNote = useCallback(
    async (note: string) => {
      if (!noteDraft) return;
      const trimmed = note.trim();
      if (noteDraft.kind === "new") {
        await onCreateHighlight(
          defaultColor,
          {
            offsetStart: noteDraft.selection.charRange.start,
            offsetEnd: noteDraft.selection.charRange.end,
            text: noteDraft.selection.text,
          },
          trimmed.length > 0 ? trimmed : undefined,
        );
      } else {
        await onSetNote(noteDraft.highlight.id, trimmed.length > 0 ? trimmed : null);
      }
      setNoteDraft(null);
    },
    [noteDraft, onCreateHighlight, onSetNote, defaultColor],
  );

  if (!wrapped) {
    return <View style={{ height: 400 }} />;
  }

  const toolbarPos = selection ? toolbarPosition(selection.rect, height) : null;

  return (
    <View style={{ position: "relative" }}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: wrapped, baseUrl: assetBase }}
        style={{ height, width: "100%", backgroundColor: "transparent" }}
        scrollEnabled={false}
        onMessage={onMessage}
        showsVerticalScrollIndicator={false}
        androidLayerType="software"
      />

      {selection && toolbarPos && (
        <View
          pointerEvents="box-none"
          style={[styles.toolbarWrap, { top: toolbarPos.top, left: toolbarPos.left }]}
        >
          <SelectionToolbar
            variant="actions"
            foregroundColor={palette.text}
            style={{ backgroundColor: floatingBgFor(theme), borderColor: borderFor(theme) }}
            onCopy={handleCopySelection}
            onHighlight={() => {
              void handleHighlightSelection(defaultColor);
            }}
            onAsk={handleAskSelection}
            onAddNote={handleAddNote}
          />
        </View>
      )}

      <Sheet
        visible={focused !== null}
        onClose={() => setFocused(null)}
        style={{ backgroundColor: palette.surface }}
      >
        {focused && (
          <FocusedHighlightCard
            highlight={focused}
            noteBody={notesByHighlightId.get(focused.id)?.body ?? null}
            theme={theme}
            onChangeColor={handleChangeFocusedColor}
            onEditNote={handleEditFocusedNote}
            onDelete={handleDeleteFocused}
            onClose={() => setFocused(null)}
          />
        )}
      </Sheet>

      <Sheet
        visible={noteDraft !== null}
        onClose={() => setNoteDraft(null)}
        style={{ backgroundColor: palette.surface }}
      >
        {noteDraft && (
          <NoteEditor
            theme={theme}
            initialNote={
              noteDraft.kind === "edit"
                ? (notesByHighlightId.get(noteDraft.highlight.id)?.body ?? "")
                : ""
            }
            quote={
              noteDraft.kind === "edit" ? noteDraft.highlight.textSnippet : noteDraft.selection.text
            }
            onCancel={() => setNoteDraft(null)}
            onAsk={() => {
              const quote =
                noteDraft.kind === "edit"
                  ? noteDraft.highlight.textSnippet
                  : noteDraft.selection.text;
              onAskSelection?.(quote);
              setNoteDraft(null);
            }}
            onSave={handleSaveNote}
          />
        )}
      </Sheet>
    </View>
  );
}

function toolbarPosition(rect: Rect, webHeight: number): { top: number; left: number } | null {
  if (!Number.isFinite(rect.top) || !Number.isFinite(rect.left)) return null;
  const above = rect.top - TOOLBAR_HEIGHT - TOOLBAR_MARGIN >= 0;
  const top = above
    ? rect.top - TOOLBAR_HEIGHT - TOOLBAR_MARGIN
    : Math.min(rect.top + rect.height + TOOLBAR_MARGIN, webHeight - TOOLBAR_HEIGHT - 8);
  const center = rect.left + rect.width / 2;
  const left = Math.max(8, center - TOOLBAR_WIDTH / 2);
  return { top, left };
}

function FocusedHighlightCard({
  highlight,
  noteBody,
  theme,
  onChangeColor,
  onEditNote,
  onDelete,
  onClose,
}: {
  highlight: Highlight;
  noteBody: string | null;
  theme: Theme;
  onChangeColor: (color: HighlightColor) => void;
  onEditNote: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const palette = themeColors(theme);
  const muted = mutedFor(theme);
  return (
    <>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardLabel, { color: muted }]}>Highlight</Text>
        <IconButton aria-label="Close" size="sm" onPress={onClose}>
          <Icons.Close size={14} color={palette.text} />
        </IconButton>
      </View>
      <Text style={[styles.cardQuote, { color: palette.text }]} numberOfLines={4}>
        {`“${highlight.textSnippet}”`}
      </Text>
      {noteBody && (
        <View style={[styles.notePreview, { backgroundColor: noteBgFor(theme) }]}>
          <Text style={{ color: palette.text }}>{noteBody}</Text>
        </View>
      )}
      <View style={styles.cardActionsRow}>
        <SelectionToolbar onPickColor={onChangeColor} />
        <View style={{ flexDirection: "row", gap: 4 }}>
          <IconButton
            aria-label={noteBody ? "Edit note" : "Add note"}
            size="sm"
            onPress={onEditNote}
          >
            <Icons.Note size={16} color={palette.text} />
          </IconButton>
          <IconButton aria-label="Delete highlight" size="sm" onPress={onDelete}>
            <Icons.Close size={16} color={palette.text} />
          </IconButton>
        </View>
      </View>
    </>
  );
}

function NoteEditor({
  theme,
  initialNote,
  quote,
  onCancel,
  onAsk,
  onSave,
}: {
  theme: Theme;
  initialNote: string;
  quote: string;
  onCancel: () => void;
  onAsk: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const palette = themeColors(theme);
  const muted = mutedFor(theme);
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  return (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.segment, { backgroundColor: noteBgFor(theme) }]}>
          <View style={[styles.segmentActive, { backgroundColor: palette.bg }]}>
            <Icons.Highlight size={12} color={palette.text} />
            <Text style={[styles.segmentTextActive, { color: palette.text }]}>On passage</Text>
          </View>
          <View style={styles.segmentInactive}>
            <Icons.Note size={12} color={muted} />
            <Text style={[styles.segmentText, { color: muted }]}>Standalone</Text>
          </View>
        </View>
        <IconButton aria-label="Close" size="sm" onPress={onCancel}>
          <Icons.Close size={14} color={palette.text} />
        </IconButton>
      </View>
      <View style={[styles.noteQuote, { borderLeftColor: color.highlight.pink }]}>
        <Text style={[styles.cardQuote, { color: palette.fgSubtle }]} numberOfLines={4}>
          {`“${quote}”`}
        </Text>
      </View>
      <TextInput
        autoFocus
        multiline
        placeholder="What did you think?"
        placeholderTextColor={muted}
        value={value}
        onChangeText={setValue}
        style={[
          styles.noteInput,
          { backgroundColor: noteBgFor(theme), color: palette.text, borderColor: borderFor(theme) },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Bainder about this"
        onPress={onAsk}
        style={[styles.askShortcut, { backgroundColor: noteBgFor(theme) }]}
      >
        <Icons.Sparkles size={14} color={palette.accent} />
        <Text style={[styles.askShortcutText, { color: palette.accent }]}>
          Ask Bainder about this
        </Text>
        <Icons.Chevron size={12} color={palette.accent} />
      </Pressable>
      <View style={styles.editorActions}>
        <Pressable
          onPress={onCancel}
          disabled={saving}
          style={({ pressed }) => [styles.editorCancel, pressed && { opacity: 0.7 }]}
        >
          <Text style={{ color: palette.text }}>Cancel</Text>
        </Pressable>
        <Button
          variant="primary"
          disabled={saving}
          onPress={async () => {
            setSaving(true);
            try {
              await onSave(value);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save note"}
        </Button>
      </View>
    </>
  );
}

function mutedFor(theme: Theme): string {
  if (theme === "dark") return color.night[200];
  if (theme === "sepia") return color.sepia[700];
  return color.paper[500];
}

function borderFor(theme: Theme): string {
  if (theme === "dark") return color.night[700];
  if (theme === "sepia") return color.sepia[200];
  return color.paper[200];
}

function noteBgFor(theme: Theme): string {
  if (theme === "dark") return color.night[800];
  if (theme === "sepia") return color.sepia[50];
  return color.paper[100];
}

function floatingBgFor(theme: Theme): string {
  if (theme === "dark") return color.night[800];
  if (theme === "sepia") return color.sepia[50];
  return color.paper[50];
}

const styles = StyleSheet.create({
  toolbarWrap: {
    position: "absolute",
    width: TOOLBAR_WIDTH,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
    gap: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardQuote: {
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 22,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
  },
  segmentActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "rgba(0,0,0,1)",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentInactive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentTextActive: {
    fontSize: 12,
    fontWeight: "600",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noteQuote: {
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  notePreview: {
    padding: 10,
    borderRadius: 8,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  noteInput: {
    minHeight: 110,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 23,
    textAlignVertical: "top",
  },
  askShortcut: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  askShortcutText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  editorActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  editorCancel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
