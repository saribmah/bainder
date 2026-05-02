import {
  createContext,
  type CSSProperties,
  type FormEvent,
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
  Wordmark,
  useTheme,
  type Theme,
} from "@bainder/ui";
import type {
  Document,
  EpubChapter,
  EpubChapterSummary,
  EpubDetail,
  EpubTocItem,
  Highlight,
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
        <ReaderMetaProvider>
          <ReaderTocProvider>
            <ReaderHighlightsProvider>
              <ReaderShell doc={doc} onClose={handleClose}>
                <EpubBody documentId={doc.id} initialOrder={doc.progress?.epubChapterOrder ?? 0} />
              </ReaderShell>
            </ReaderHighlightsProvider>
          </ReaderTocProvider>
        </ReaderMetaProvider>
      </ReaderPositionProvider>
    </ThemeProvider>
  );
}

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

type ReaderMeta = {
  authors: ReadonlyArray<string>;
  chapterTitle: string;
  chapterOrder: number;
  chapterCount: number;
  quote: string;
};

const ReaderMetaContext = createContext<{
  meta: ReaderMeta | null;
  setMeta: (meta: ReaderMeta | null) => void;
} | null>(null);

function ReaderMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<ReaderMeta | null>(null);
  const value = useMemo(() => ({ meta, setMeta }), [meta]);
  return <ReaderMetaContext.Provider value={value}>{children}</ReaderMetaContext.Provider>;
}

function useReaderMeta() {
  const ctx = useContext(ReaderMetaContext);
  if (!ctx) throw new Error("useReaderMeta must be used inside <Reader>");
  return ctx;
}

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
  const { meta } = useReaderMeta();
  const { toc } = useReaderToc();
  const refresh = useReaderHighlights();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tocOpen, setTocOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [askDraft, setAskDraft] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [fontScale, setFontScale] = useState<ReaderFontScale>("standard");

  const currentOrder = meta?.chapterOrder ?? Math.max(0, Number(searchParams.get("chapter") ?? 0));
  const authorLabel = meta?.authors.length
    ? meta.authors.join(", ")
    : doc.originalFilename.replace(/\.[^.]+$/, "");
  const progressLabel =
    meta?.chapterCount !== undefined ? `${currentOrder + 1} / ${meta.chapterCount}` : position;

  const handleAskSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = askDraft.trim();
      setLastPrompt(trimmed || "What's the most important idea in this chapter?");
      setAskDraft("");
      setAiOpen(true);
    },
    [askDraft],
  );

  const toggleFontScale = useCallback(() => {
    setFontScale((curr) => (curr === "standard" ? "large" : "standard"));
  }, []);

  return (
    <main
      className="flex h-dvh min-h-screen flex-col overflow-hidden"
      style={{ background: "var(--bd-bg)", color: "var(--bd-fg)" }}
    >
      <header
        className="z-10 flex h-16 shrink-0 items-center gap-5 border-b px-4 md:px-7"
        style={{ background: "var(--bd-bg)", borderColor: "var(--bd-border)" }}
      >
        <IconButton aria-label="Close reader" size="sm" onClick={onClose}>
          <Icons.Close size={16} />
        </IconButton>

        <div className="hidden sm:block">
          <Wordmark size="sm" color="var(--bd-fg)" />
        </div>
        <span
          aria-hidden
          className="hidden h-6 w-px sm:block"
          style={{ background: "var(--bd-border)" }}
        />

        <div className="min-w-0 flex-1">
          <div className="t-label-l truncate">{doc.title}</div>
          <div className="t-body-s truncate" style={{ color: "var(--bd-fg-muted)" }}>
            {authorLabel}
          </div>
        </div>

        {progressLabel && (
          <div
            className="hidden shrink-0 font-mono text-xs tabular-nums md:block"
            style={{ color: "var(--bd-fg-muted)" }}
          >
            {progressLabel}
          </div>
        )}

        <div className="hidden items-center gap-1 md:flex">
          <IconButton
            aria-label={
              fontScale === "standard" ? "Use larger reader type" : "Use standard reader type"
            }
            size="sm"
            onClick={toggleFontScale}
          >
            <Icons.Type size={16} />
          </IconButton>
          <IconButton aria-label={`Theme: ${theme}`} size="sm" onClick={cycleTheme}>
            {theme === "dark" ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
          </IconButton>
          <IconButton aria-label="Open notes" size="sm" onClick={() => setNotesOpen(true)}>
            <Icons.Settings size={16} />
          </IconButton>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside
          className="hidden min-h-0 overflow-hidden border-r px-6 py-8 lg:block"
          style={{ borderColor: "var(--bd-border)" }}
        >
          {toc ? (
            <ContentsRail
              toc={toc.toc}
              chapters={toc.chapters}
              currentOrder={toc.currentOrder}
              onJump={toc.onJump}
            />
          ) : (
            <RailSkeleton label="Contents" />
          )}
        </aside>

        <section data-reader-scroll className="min-h-0 overflow-y-auto px-6 py-8 md:px-10 md:py-14">
          <article className="mx-auto max-w-[620px] pb-32 md:pb-12">
            {withReaderFont(children, fontScale)}
          </article>
        </section>

        <aside
          className="hidden min-h-0 overflow-hidden border-l px-6 py-8 xl:block"
          style={{ borderColor: "var(--bd-border)" }}
        >
          <NotesRail
            documentId={doc.id}
            chapters={toc?.chapters}
            currentOrder={currentOrder}
            refreshToken={refresh?.refreshToken ?? 0}
            onJumpEpub={(order) => setSearchParams({ chapter: String(order) })}
          />
        </aside>
      </div>

      <AskBainderBar draft={askDraft} onDraftChange={setAskDraft} onSubmit={handleAskSubmit} />

      <div className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2 md:hidden">
        <FloatingToolbar>
          {toc && (
            <FloatingToolbarButton aria-label="Table of contents" onClick={() => setTocOpen(true)}>
              <Icons.BookOpen size={20} />
            </FloatingToolbarButton>
          )}
          <FloatingToolbarButton aria-label="Ask Bainder" onClick={() => setAiOpen(true)}>
            <Icons.Sparkles size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton
            aria-label={
              fontScale === "standard" ? "Use larger reader type" : "Use standard reader type"
            }
            onClick={toggleFontScale}
          >
            <Icons.Type size={20} />
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label={`Theme: ${theme}`} onClick={cycleTheme}>
            {theme === "dark" ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
          </FloatingToolbarButton>
          <FloatingToolbarButton aria-label="Notes" onClick={() => setNotesOpen(true)}>
            <Icons.Note size={20} />
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

      {aiOpen && (
        <ReaderAiSheet
          theme={theme}
          title={doc.title}
          chapterLabel={
            meta ? `Chapter ${meta.chapterOrder + 1} - ${meta.chapterTitle}` : "Current chapter"
          }
          quote={meta?.quote}
          prompt={lastPrompt}
          onClose={() => setAiOpen(false)}
        />
      )}
    </main>
  );
}

function EpubBody({ documentId, initialOrder }: { documentId: string; initialOrder: number }) {
  const { client, baseUrl } = useSdk();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPosition } = useReaderPosition();
  const { setMeta } = useReaderMeta();
  const { setToc } = useReaderToc();
  const [detail, setDetail] = useState<EpubDetail | null>(null);
  const [chapter, setChapter] = useState<EpubChapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const htmlRef = useRef<HTMLDivElement>(null);

  const orderParam = searchParams.get("chapter");
  const order = orderParam !== null ? Math.max(0, Number(orderParam)) : Math.max(0, initialOrder);

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

  useEffect(() => {
    if (!htmlRef.current || !chapter) return;
    htmlRef.current.querySelectorAll('img[src^="assets/"]').forEach((img) => {
      const src = img.getAttribute("src");
      if (src) {
        img.setAttribute("src", `${baseUrl}/documents/${documentId}/${src}`);
      }
    });
  }, [chapter, baseUrl, documentId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("[data-reader-scroll]")?.scrollTo({ top: 0, behavior: "instant" });
  }, [order]);

  useEffect(() => {
    const handle = setTimeout(() => {
      client.progress.upsert({ id: documentId, epubChapterOrder: order }).catch(() => {});
    }, 1000);
    return () => clearTimeout(handle);
  }, [client, documentId, order]);

  useEffect(() => {
    if (!detail) return;
    setPosition(`Chapter ${order + 1} of ${detail.chapters.length}`);
    return () => setPosition(null);
  }, [detail, order, setPosition]);

  useEffect(() => {
    if (!detail || !chapter) {
      setMeta(null);
      return;
    }
    setMeta({
      authors: detail.book.authors,
      chapterTitle: chapter.title,
      chapterOrder: order,
      chapterCount: detail.chapters.length,
      quote: excerptText(chapter.text, 220),
    });
    return () => setMeta(null);
  }, [chapter, detail, order, setMeta]);

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
      <header className="mb-9 text-center">
        <div className="font-display text-[28px] leading-tight font-medium tracking-[0] text-[var(--bd-fg)]">
          Chapter {String(order + 1).padStart(2, "0")}
        </div>
        <h1 className="mt-2 font-display text-[28px] leading-tight font-normal tracking-[0] text-[var(--bd-fg)]">
          {chapter.title}
        </h1>
      </header>

      <div
        ref={htmlRef}
        className="bd-reader-prose"
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

type ReaderFontScale = "standard" | "large";

function withReaderFont(children: ReactNode, scale: ReaderFontScale) {
  return (
    <div
      style={
        {
          "--bd-reader-font-size": scale === "large" ? "21px" : "19px",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

function ContentsRail({
  toc,
  chapters,
  currentOrder,
  onJump,
}: {
  toc: ReadonlyArray<EpubTocItem>;
  chapters: ReadonlyArray<EpubChapterSummary>;
  currentOrder: number;
  onJump: (order: number) => void;
}) {
  const orderByFile = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of chapters) {
      if (!map.has(ch.href)) map.set(ch.href, ch.order);
    }
    return map;
  }, [chapters]);

  const chapterRows =
    toc.length > 0
      ? toc.map((item) => ({
          key: `${item.index}-${item.href}`,
          title: item.title,
          order: orderByFile.get(item.fileHref),
          depth: item.depth,
        }))
      : chapters.map((chapter) => ({
          key: chapter.id,
          title: chapter.title,
          order: chapter.order,
          depth: 0,
        }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="t-label-s mb-3" style={{ color: "var(--bd-fg-muted)" }}>
        Contents
      </div>
      <div className="min-h-0 overflow-y-auto pr-1">
        {chapterRows.map((item) => {
          const reachable = item.order !== undefined;
          const active = reachable && item.order === currentOrder;
          return (
            <button
              key={item.key}
              type="button"
              disabled={!reachable}
              onClick={() => {
                if (item.order !== undefined) onJump(item.order);
              }}
              className="mb-1 flex w-full gap-2 rounded-[10px] px-3 py-2.5 text-left transition-colors disabled:opacity-50"
              style={{
                background: active ? "var(--bd-surface-raised)" : "transparent",
                paddingLeft: 12 + item.depth * 14,
              }}
            >
              <span
                className="shrink-0 font-mono text-[12px] leading-5 tabular-nums"
                style={{ color: "var(--bd-fg-muted)" }}
              >
                {item.order !== undefined ? item.order + 1 : "-"}
              </span>
              <span
                className="t-body-m min-w-0 flex-1 leading-snug"
                style={{ color: active ? "var(--bd-fg)" : "var(--bd-fg-subtle)" }}
              >
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RailSkeleton({ label }: { label: string }) {
  return (
    <div>
      <div className="t-label-s mb-4" style={{ color: "var(--bd-fg-muted)" }}>
        {label}
      </div>
      <div className="space-y-2">
        <Skeleton width="90%" height={16} />
        <Skeleton width="80%" height={16} />
        <Skeleton width="95%" height={16} />
        <Skeleton width="72%" height={16} />
      </div>
    </div>
  );
}

function AskBainderBar({
  draft,
  onDraftChange,
  onSubmit,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="hidden shrink-0 items-center gap-3 border-t px-7 py-3 md:flex"
      style={{ background: "var(--bd-bg)", borderColor: "var(--bd-border)" }}
    >
      <Icons.Sparkles size={18} color="var(--bd-accent)" />
      <span className="t-label-l shrink-0" style={{ color: "var(--bd-accent)" }}>
        Ask Bainder
      </span>
      <input
        className="t-body-m h-10 min-w-0 flex-1 rounded-full border-0 px-4 outline-none"
        style={{ background: "var(--bd-surface-raised)", color: "var(--bd-fg)" }}
        placeholder="Ask anything about this chapter..."
        value={draft}
        onChange={(event) => onDraftChange(event.currentTarget.value)}
      />
      <Button type="submit" variant="primary" size="sm">
        Send
      </Button>
    </form>
  );
}

function ReaderAiSheet({
  theme,
  title,
  chapterLabel,
  quote,
  prompt,
  onClose,
}: {
  theme: Theme;
  title: string;
  chapterLabel: string;
  quote?: string;
  prompt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const backdropBg = theme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(20, 15, 10, 0.18)";
  const answer =
    quote && prompt
      ? "Norman is drawing a careful line. An affordance is the underlying relationship between an object and a person: what is possible. A signifier is the visible cue that tells you that possibility exists."
      : "This chapter is about the cues that make actions legible. Affordances describe what can be done; signifiers help people discover it.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask Bainder"
      className="fixed inset-0 z-30 flex flex-col justify-end"
      style={{ background: backdropBg }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="mx-auto flex max-h-[72vh] w-full max-w-[720px] flex-col gap-3 rounded-t-[28px] px-6 py-4 shadow-[var(--sh-sheet)] md:px-7 md:pb-6"
        style={{ background: "var(--bd-bg)", color: "var(--bd-fg)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          aria-hidden
          className="h-1 w-10 self-center rounded-full"
          style={{ background: "var(--bd-border-strong)" }}
        />
        <div className="flex items-center gap-2">
          <Icons.Sparkles size={18} color="var(--bd-accent)" />
          <span className="t-label-l" style={{ color: "var(--bd-accent)" }}>
            Bainder
          </span>
          <span className="t-body-s ml-auto truncate" style={{ color: "var(--bd-fg-muted)" }}>
            {chapterLabel} · {title}
          </span>
        </div>
        {quote && (
          <blockquote
            className="rounded-[14px] border-l-2 px-4 py-3 font-reading text-sm leading-relaxed italic"
            style={{
              background: "var(--bd-surface-raised)",
              borderColor: "var(--bd-accent)",
              color: "var(--bd-fg-subtle)",
            }}
          >
            "{quote}"
          </blockquote>
        )}
        {prompt && (
          <div className="flex justify-end">
            <div
              className="max-w-[72%] rounded-[18px] rounded-br px-4 py-2.5 text-sm leading-snug"
              style={{ background: "var(--bd-action)", color: "var(--bd-action-fg)" }}
            >
              {prompt}
            </div>
          </div>
        )}
        <p
          className="font-reading text-base leading-relaxed"
          style={{ color: "var(--bd-fg-subtle)" }}
        >
          {answer}
        </p>
        <div className="flex flex-wrap gap-2">
          {["Give me an example", "Why does this matter?", "Save to notes"].map((item) => (
            <span key={item} className="bd-chip bd-chip-outline">
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function NotesRail({
  documentId,
  chapters,
  currentOrder,
  refreshToken,
  onJumpEpub,
}: {
  documentId: string;
  chapters?: ReadonlyArray<EpubChapterSummary>;
  currentOrder?: number;
  refreshToken: number;
  onJumpEpub: (chapterOrder: number) => void;
}) {
  const { client } = useSdk();
  const [items, setItems] = useState<ReadonlyArray<Highlight> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titleByOrder = useMemo(() => {
    const map = new Map<number, string>();
    if (chapters) {
      for (const ch of chapters) map.set(ch.order, ch.title);
    }
    return map;
  }, [chapters]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    client.highlight
      .list({ documentId })
      .then((res) => {
        if (!cancelled) setItems(res.data?.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(String(err));
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, documentId, refreshToken]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="t-label-s mb-3" style={{ color: "var(--bd-fg-muted)" }}>
        Your notes {items ? `· ${items.length}` : ""}
      </div>
      <div className="min-h-0 overflow-y-auto pr-1">
        {error && (
          <p className="t-body-s" style={{ color: "var(--bd-fg-muted)" }}>
            {error}
          </p>
        )}
        {items === null && <RailSkeleton label="Notes" />}
        {items?.length === 0 && !error && (
          <p className="t-body-s" style={{ color: "var(--bd-fg-muted)" }}>
            Highlight a passage to start your notebook.
          </p>
        )}
        {items?.map((h) => {
          const isCurrent = h.epubChapterOrder === currentOrder;
          const label = labelFor(h, titleByOrder);
          return (
            <button
              key={h.id}
              type="button"
              className="mb-3 block w-full rounded-xl p-3 text-left"
              style={{
                background: "var(--bd-surface-raised)",
                boxShadow: isCurrent ? "inset 0 0 0 1px var(--bd-border-strong)" : undefined,
              }}
              onClick={() => onJumpEpub(h.epubChapterOrder)}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: `var(--hl-${h.color})` }}
                />
                <span className="t-body-s truncate" style={{ color: "var(--bd-fg-muted)" }}>
                  {label} · {formatRelativeTime(h.createdAt)}
                </span>
              </div>
              <p
                className="mt-2 line-clamp-3 font-reading text-[13px] leading-snug italic"
                style={{ color: "var(--bd-fg-subtle)" }}
              >
                "{h.textSnippet}"
              </p>
              {h.note && (
                <p className="t-body-s mt-2 line-clamp-3" style={{ color: "var(--bd-fg-subtle)" }}>
                  {h.note}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <nav className="mt-12 hidden justify-between gap-3 md:flex">
      <Button variant="secondary" disabled={!canPrev} onClick={onPrev}>
        ← {prevLabel}
      </Button>
      <Button variant="secondary" disabled={!canNext} onClick={onNext}>
        {nextLabel} →
      </Button>
    </nav>
  );
}

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
  const diffMs = new Date(iso).getTime() - Date.now();
  let value = diffMs / 1000;
  for (const [step, unit] of RELATIVE_THRESHOLDS) {
    if (Math.abs(value) < step) return fmt.format(Math.round(value), unit);
    value /= step;
  }
  return fmt.format(Math.round(value), "year");
};

const labelFor = (h: Highlight, titleByOrder: Map<number, string>): string => {
  const title = titleByOrder.get(h.epubChapterOrder);
  return title ? `Ch. ${h.epubChapterOrder + 1} · ${title}` : `Chapter ${h.epubChapterOrder + 1}`;
};

const excerptText = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}...`;
};
