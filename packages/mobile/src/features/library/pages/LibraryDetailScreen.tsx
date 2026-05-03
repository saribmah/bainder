import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, Icons, Skeleton, color } from "@bainder/ui";
import type { Document, DocumentManifest, Note } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider";
import { KIND_LABEL } from "../constants";
import { DocumentShelfChips } from "../components/DocumentShelfChips";
import { BottomTabs } from "../../shell";
import { LibraryCover } from "../components/LibraryCover";
import { CreateShelfSheet } from "../components/ShelfSheets";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useLibraryShelves } from "../hooks/useLibraryShelves";
import { libraryStyles as styles } from "../library.styles";
import {
  estimateMinutes,
  formatWordCount,
  progressPercent,
  sectionOrderFromKey,
  sourceLabel,
} from "../utils/document";

export function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { client } = useSdk();
  const { uploadDocument } = useLibraryDocuments();
  const [doc, setDoc] = useState<Document | null>(null);
  const [manifest, setManifest] = useState<DocumentManifest | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createShelfOpen, setCreateShelfOpen] = useState(false);
  const {
    customShelves,
    memberships,
    workingShelfId,
    createShelf,
    addDocumentToShelf,
    toggleDocumentShelf,
  } = useLibraryShelves(doc ? [doc] : null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      client.document.get({ id }),
      client.document.getManifest({ id }),
      client.note.list({ documentId: id }),
    ])
      .then(([docRes, manifestRes, noteRes]) => {
        if (cancelled) return;
        if (!docRes.data) {
          setError("Document not found");
          return;
        }
        setDoc(docRes.data);
        setManifest(manifestRes.data ?? null);
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
            onPress={() => router.push("/library")}
          >
            <Icons.Back size={16} color={color.paper[800]} />
          </Pressable>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.iconButton}>
              <Icons.Bookmark size={16} color={color.paper[800]} />
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.iconButton}>
              <Icons.Share size={16} color={color.paper[800]} />
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
                Continue · {pct}%
              </Button>
              <Pressable accessibilityRole="button" style={styles.iconButton} onPress={openReader}>
                <Icons.Sparkles size={16} color={color.wine[700]} />
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
                ["Contents", manifest?.sections.length ?? 0],
                ["About", null],
                ["Notes", notes.length],
              ].map(([label, count], index) => (
                <Chip key={label} variant={index === 0 ? "active" : "filled"}>
                  {count === null ? label : `${label} · ${count}`}
                </Chip>
              ))}
            </View>

            {manifest ? (
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
                    {current && <Icons.Chevron size={14} color={color.paper[700]} />}
                  </View>
                );
              })
            ) : (
              <Skeleton height={260} />
            )}
          </>
        )}
      </ScrollView>
      <BottomTabs active="library" bottom={insets.bottom} onUpload={uploadDocument} />
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
