import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  FloatingToolbar,
  FloatingToolbarButton,
  IconButton,
  Icons,
  Skeleton,
  ThemeProvider,
  useTheme,
} from "@bainder/ui";
import type {
  Document,
  EpubChapter,
  EpubChapterSummary,
  EpubDetail,
  EpubTocItem,
} from "@bainder/sdk";
import { useSdk } from "../sdk";
import { HighlightLayer } from "./HighlightLayer";
import { ReaderHighlightsProvider, useReaderHighlights } from "./highlightsRefresh";
import { NotesSheet } from "./NotesSheet";
import { TocSheet } from "./TocSheet";

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const { client } = useSdk();
  const navigate = useNavigate();
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

  const handleClose = () => navigate("/library");

  if (error) {
    return (
      <ReaderState>
        <p className="t-body-m text-error">{error}</p>
        <Button variant="secondary" onClick={handleClose}>
          Back to library
        </Button>
      </ReaderState>
    );
  }

  if (!doc) {
    return (
      <main className="min-h-screen bg-paper-50 pb-32 text-paper-900">
        <header className="sticky top-0 z-10 border-b border-paper-200 bg-paper-50">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
            <Skeleton shape="circle" width={32} height={32} />
            <div className="min-w-0 flex-1">
              <Skeleton width="60%" height={14} />
              <Skeleton width="30%" height={12} className="mt-1.5" />
            </div>
          </div>
        </header>
        <article className="mx-auto max-w-2xl px-6 py-8">
          <ChapterSkeleton />
        </article>
      </main>
    );
  }

  if (doc.status !== "processed") {
    return (
      <ReaderState>
        <p className="t-body-m text-paper-500">
          {doc.status === "failed"
            ? (doc.errorReason ?? "Processing failed.")
            : "This document is still being processed. Please wait a moment and try again."}
        </p>
        <Button variant="secondary" onClick={handleClose}>
          Back to library
        </Button>
      </ReaderState>
    );
  }

  return (
    <ThemeProvider defaultTheme="light">
      <ReaderPositionProvider>
        <ReaderTocProvider>
          <ReaderHighlightsProvider>
            <ReaderShell doc={doc} onClose={handleClose}>
              <EpubBody documentId={doc.id} initialOrder={doc.progress?.epubChapterOrder ?? 0} />
            </ReaderShell>
          </ReaderHighlightsProvider>
        </ReaderTocProvider>
      </ReaderPositionProvider>
    </ThemeProvider>
  );
}

// ─── Position context (current chapter label) ────────────────────────────
type PositionLabel = string | null;

const ReaderPositionContext = createContext<{
  position: PositionLabel;
  setPosition: (p: PositionLabel) => void;
} | null>(null);

function ReaderPositionProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<PositionLabel>(null);
  const value = useMemo(() => ({ position, setPosition }), [position]);
  return <ReaderPositionContext.Provider value={value}>{children}</ReaderPositionContext.Provider>;
}

function useReaderPosition() {
  const ctx = useContext(ReaderPositionContext);
  if (!ctx) throw new Error("useReaderPosition must be used inside <Reader>");
  return ctx;
}

// ─── TOC context ────────────────────────────────────────────────────────
type TocState = {
  toc: ReadonlyArray<EpubTocItem>;
  chapters: ReadonlyArray<EpubChapterSummary>;
  currentOrder: number;
  onJump: (order: number) => void;
};

const ReaderTocContext = createContext<{
  toc: TocState | null;
  setToc: (t: TocState | null) => void;
} | null>(null);

function ReaderTocProvider({ children }: { children: ReactNode }) {
  const [toc, setToc] = useState<TocState | null>(null);
  const value = useMemo(() => ({ toc, setToc }), [toc]);
  return <ReaderTocContext.Provider value={value}>{children}</ReaderTocContext.Provider>;
}

function useReaderToc() {
  const ctx = useContext(ReaderTocContext);
  if (!ctx) throw new Error("useReaderToc must be used inside <Reader>");
  return ctx;
}

function ReaderState({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-50 px-6 text-paper-900">
      {children}
    </main>
  );
}

function ReaderShell({
  doc,
  onClose,
  children,
}: {
  doc: Document;
  onClose: () => void;
  children: ReactNode;
}) {
  const { theme, cycleTheme } = useTheme();
  const { position } = useReaderPosition();
  const { toc } = useReaderToc();
  const refresh = useReaderHighlights();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const currentOrder = Math.max(0, Number(searchParams.get("chapter") ?? 0));

  const pageBg =
    theme === "dark"
      ? "bg-night-900 text-night-50"
      : theme === "sepia"
        ? "bg-sepia-50 text-sepia-900"
        : "bg-paper-50 text-paper-900";
  const headerBg =
    theme === "dark"
      ? "bg-night-900 border-b border-[oklch(28%_0.012_240)]"
      : theme === "sepia"
        ? "bg-sepia-50 border-b border-sepia-200"
        : "bg-paper-50 border-b border-paper-200";
  const positionColor =
    theme === "dark" ? "text-night-200" : theme === "sepia" ? "text-sepia-700" : "text-paper-500";

  return (
    <main className={`min-h-screen ${pageBg} pb-32`}>
      <header className={`sticky top-0 z-10 ${headerBg}`}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <IconButton aria-label="Close" size="sm" onClick={onClose}>
            <Icons.Close size={16} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <div className="t-label-l truncate">{doc.title}</div>
            {position && <div className={`t-body-s mt-0.5 ${positionColor}`}>{position}</div>}
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-6 py-8">{children}</article>

      <div className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2">
        <FloatingToolbar>
          {toc && (
            <FloatingToolbarButton aria-label="Table of contents" onClick={() => setTocOpen(true)}>
              <Icons.List size={20} />
            </FloatingToolbarButton>
          )}
          <FloatingToolbarButton aria-label="Notes" onClick={() => setNotesOpen(true)}>
            <Icons.Note size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label={`Theme: ${theme}`} onClick={cycleTheme}>
            {theme === "dark" ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
          </FloatingToolbarButton>
        </FloatingToolbar>
      </div>

      {toc && tocOpen && (
        <TocSheet
          toc={toc.toc}
          chapters={toc.chapters}
          currentOrder={toc.currentOrder}
          onJump={(order) => {
            toc.onJump(order);
            setTocOpen(false);
          }}
          onClose={() => setTocOpen(false)}
        />
      )}

      {notesOpen && (
        <NotesSheet
          documentId={doc.id}
          chapters={toc?.chapters}
          currentOrder={currentOrder}
          refreshToken={refresh?.refreshToken ?? 0}
          onJumpEpub={(order) => {
            setSearchParams({ chapter: String(order) });
            setNotesOpen(false);
          }}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </main>
  );
}

// ─── EPUB body ──────────────────────────────────────────────────────────
function EpubBody({ documentId, initialOrder }: { documentId: string; initialOrder: number }) {
  const { client, baseUrl } = useSdk();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPosition } = useReaderPosition();
  const { setToc } = useReaderToc();
  const [detail, setDetail] = useState<EpubDetail | null>(null);
  const [chapter, setChapter] = useState<EpubChapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const htmlRef = useRef<HTMLDivElement>(null);

  // Explicit URL param wins over saved progress so chapter navigation and
  // shared/copied URLs behave predictably.
  const orderParam = searchParams.get("chapter");
  const order = orderParam !== null ? Math.max(0, Number(orderParam)) : Math.max(0, initialOrder);

  // Reflect resumed position in the URL so other consumers (notes sheet,
  // share, refresh) see the same source of truth.
  useEffect(() => {
    if (orderParam === null) {
      setSearchParams({ chapter: String(order) }, { replace: true });
    }
  }, [orderParam, order, setSearchParams]);

  const navigateTo = useCallback(
    (next: number) => {
      setSearchParams({ chapter: String(next) });
    },
    [setSearchParams],
  );

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

  // Rewrite relative `assets/...` image URLs to the asset endpoint.
  useEffect(() => {
    if (!htmlRef.current || !chapter) return;
    htmlRef.current.querySelectorAll('img[src^="assets/"]').forEach((img) => {
      const src = img.getAttribute("src");
      if (src) {
        img.setAttribute("src", `${baseUrl}/documents/${documentId}/${src}`);
      }
    });
  }, [chapter, baseUrl, documentId]);

  // Reset scroll on chapter change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [order]);

  // Persist reading progress after the user stabilizes on a chapter for ~1s.
  useEffect(() => {
    const handle = setTimeout(() => {
      client.progress.upsert({ id: documentId, epubChapterOrder: order }).catch(() => {});
    }, 1000);
    return () => clearTimeout(handle);
  }, [client, documentId, order]);

  // Publish position label for the sticky header.
  useEffect(() => {
    if (!detail) return;
    setPosition(`Chapter ${order + 1} of ${detail.chapters.length}`);
    return () => setPosition(null);
  }, [detail, order, setPosition]);

  // Publish TOC so the shell can render the TOC button + sheet.
  useEffect(() => {
    if (!detail || detail.toc.length === 0) {
      setToc(null);
      return;
    }
    setToc({
      toc: detail.toc,
      chapters: detail.chapters,
      currentOrder: order,
      onJump: navigateTo,
    });
    return () => setToc(null);
  }, [detail, order, navigateTo, setToc]);

  if (error) return <p className="t-body-m text-error">{error}</p>;
  if (!detail || !chapter) return <ChapterSkeleton />;

  const totalChapters = detail.chapters.length;

  return (
    <>
      <header className="mb-8">
        <h1 className="t-display-m">{chapter.title}</h1>
      </header>

      <div
        ref={htmlRef}
        className="t-reading-l prose-reader"
        dangerouslySetInnerHTML={{ __html: chapter.html }}
      />

      <HighlightLayer
        containerRef={htmlRef}
        documentId={documentId}
        chapterOrder={order}
        contentKey={chapter.id}
      />

      <ChapterNav
        canPrev={order > 0}
        canNext={order < totalChapters - 1}
        onPrev={() => navigateTo(order - 1)}
        onNext={() => navigateTo(order + 1)}
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
  // Keyboard nav: ← / →
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canPrev) onPrev();
      if (e.key === "ArrowRight" && canNext) onNext();
    },
    [canPrev, canNext, onPrev, onNext],
  );
  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);

  return (
    <nav className="mt-12 flex justify-between gap-3">
      <Button variant="secondary" disabled={!canPrev} onClick={onPrev}>
        ← {prevLabel}
      </Button>
      <Button variant="secondary" disabled={!canNext} onClick={onNext}>
        {nextLabel} →
      </Button>
    </nav>
  );
}

// ─── Chapter skeleton (title + paragraph block) ─────────────────────────
function ChapterSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton width="70%" height={36} className="mb-6" />
      <Skeleton width="100%" height={14} />
      <Skeleton width="96%" height={14} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="88%" height={14} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="62%" height={14} />
    </div>
  );
}
