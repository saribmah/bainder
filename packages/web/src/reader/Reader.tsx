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
  ImageDocument,
  PdfDetail,
  PdfPage,
  TextDocument,
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
              {doc.kind === "epub" && <EpubBody documentId={doc.id} />}
              {doc.kind === "pdf" && <PdfBody documentId={doc.id} />}
              {doc.kind === "text" && <TextBody documentId={doc.id} />}
              {doc.kind === "image" && <ImageBody documentId={doc.id} />}
              {doc.kind === "other" && (
                <p className="t-body-m text-paper-500">
                  This document type isn't readable in-app yet.
                </p>
              )}
            </ReaderShell>
          </ReaderHighlightsProvider>
        </ReaderTocProvider>
      </ReaderPositionProvider>
    </ThemeProvider>
  );
}

// ─── Position context (current chapter / page label) ─────────────────────
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

// ─── TOC context (EPUB-only; null when no TOC available) ─────────────────
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

  const supportsHighlights = doc.kind === "epub" || doc.kind === "pdf";
  const currentOrder =
    doc.kind === "epub" ? Math.max(0, Number(searchParams.get("chapter") ?? 0)) : undefined;
  const currentPage =
    doc.kind === "pdf" ? Math.max(1, Number(searchParams.get("page") ?? 1)) : undefined;

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
          {supportsHighlights && (
            <FloatingToolbarButton aria-label="Notes" onClick={() => setNotesOpen(true)}>
              <Icons.Note size={20} />
            </FloatingToolbarButton>
          )}
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

      {supportsHighlights && notesOpen && (
        <NotesSheet
          documentId={doc.id}
          documentKind={doc.kind === "epub" ? "epub" : "pdf"}
          chapters={toc?.chapters}
          currentOrder={currentOrder}
          currentPage={currentPage}
          refreshToken={refresh?.refreshToken ?? 0}
          onJumpEpub={(order) => {
            setSearchParams({ chapter: String(order) });
            setNotesOpen(false);
          }}
          onJumpPdf={(page) => {
            setSearchParams({ page: String(page) });
            setNotesOpen(false);
          }}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </main>
  );
}

// ─── EPUB body ──────────────────────────────────────────────────────────
function EpubBody({ documentId }: { documentId: string }) {
  const { client, baseUrl } = useSdk();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPosition } = useReaderPosition();
  const { setToc } = useReaderToc();
  const [detail, setDetail] = useState<EpubDetail | null>(null);
  const [chapter, setChapter] = useState<EpubChapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const htmlRef = useRef<HTMLDivElement>(null);

  const order = Math.max(0, Number(searchParams.get("chapter") ?? 0));

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
        target={{ kind: "epub", chapterOrder: order }}
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

// ─── PDF body ───────────────────────────────────────────────────────────
function PdfBody({ documentId }: { documentId: string }) {
  const { client } = useSdk();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPosition } = useReaderPosition();
  const [detail, setDetail] = useState<PdfDetail | null>(null);
  const [page, setPage] = useState<PdfPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLPreElement>(null);

  const pageNumber = Math.max(1, Number(searchParams.get("page") ?? 1));

  useEffect(() => {
    let cancelled = false;
    client.document
      .getPdfDetail({ id: documentId })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setDetail(res.data);
        else setError("Failed to load PDF details");
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
    setPage(null);
    client.document
      .getPdfPage({ id: documentId, page: String(pageNumber) })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setPage(res.data);
        else setError("Failed to load page");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, pageNumber]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pageNumber]);

  useEffect(() => {
    if (!detail) return;
    setPosition(`Page ${pageNumber} of ${detail.pdf.pageCount}`);
    return () => setPosition(null);
  }, [detail, pageNumber, setPosition]);

  if (error) return <p className="t-body-m text-error">{error}</p>;
  if (!detail || !page) return <ChapterSkeleton />;

  const totalPages = detail.pdf.pageCount;
  const navigateTo = (next: number) => {
    setSearchParams({ page: String(next) });
  };

  return (
    <>
      <pre ref={pageRef} className="t-reading-l whitespace-pre-wrap break-words font-reading">
        {page.text}
      </pre>

      <HighlightLayer
        containerRef={pageRef}
        documentId={documentId}
        target={{ kind: "pdf", pageNumber }}
        contentKey={page.id}
      />

      <ChapterNav
        canPrev={pageNumber > 1}
        canNext={pageNumber < totalPages}
        onPrev={() => navigateTo(pageNumber - 1)}
        onNext={() => navigateTo(pageNumber + 1)}
        prevLabel="Previous page"
        nextLabel="Next page"
      />
    </>
  );
}

// ─── Text body ──────────────────────────────────────────────────────────
function TextBody({ documentId }: { documentId: string }) {
  const { client } = useSdk();
  const [text, setText] = useState<TextDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    client.document
      .getText({ id: documentId })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setText(res.data);
        else setError("Failed to load text");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId]);

  if (error) return <p className="t-body-m text-error">{error}</p>;
  if (!text) return <ChapterSkeleton />;

  return (
    <pre className="t-reading-l whitespace-pre-wrap break-words font-reading">{text.text}</pre>
  );
}

// ─── Image body ─────────────────────────────────────────────────────────
function ImageBody({ documentId }: { documentId: string }) {
  const { client, baseUrl } = useSdk();
  const [meta, setMeta] = useState<ImageDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    client.document
      .getImage({ id: documentId })
      .then((res) => {
        if (cancelled) return;
        if (res.data) setMeta(res.data);
        else setError("Failed to load image");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId]);

  const src = useMemo(() => `${baseUrl}/documents/${documentId}/raw`, [baseUrl, documentId]);

  if (error) return <p className="t-body-m text-error">{error}</p>;
  if (!meta) {
    return <Skeleton width="100%" height={420} />;
  }

  return (
    <img
      src={src}
      width={meta.width}
      height={meta.height}
      alt=""
      className="mx-auto h-auto max-w-full rounded-lg"
    />
  );
}

// ─── Chapter / page navigation row ──────────────────────────────────────
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
