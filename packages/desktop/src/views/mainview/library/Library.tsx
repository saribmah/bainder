import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookCover,
  Button,
  Card,
  Chip,
  IconButton,
  Icons,
  Input,
  Sheet,
  Skeleton,
  Toast,
  Wordmark,
} from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { authClient } from "../auth/auth.client";
import { useSdk } from "../sdk";

const ACCEPT_ATTR = ".epub,application/epub+zip";

const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
};

const KIND_GRADIENT: Record<Document["kind"], string> = {
  epub: "linear-gradient(160deg, oklch(72% 0.11 76), oklch(48% 0.12 44))",
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
  return `Chapter ${p.epubChapterOrder + 1} · ${formatRelativeTime(p.updatedAt)}`;
};

const dayLabel = () =>
  new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" })
    .format(new Date())
    .replace(",", " ·")
    .toUpperCase();

const readerName = (session: ReturnType<typeof authClient.useSession>): string => {
  const user = session.data?.user;
  const name = user?.name?.trim();
  if (name) return name.split(/\s+/)[0] ?? "Reader";
  const email = user?.email?.trim();
  if (email) return email.split("@")[0] ?? "Reader";
  return "Reader";
};

export function Library() {
  const session = authClient.useSession();
  const { client } = useSdk();
  const navigate = useNavigate();
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

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const res = await client.document.create({ file });
        if (res.error) {
          setError("Upload failed");
        } else {
          setToast(`Uploaded ${file.name}`);
          refresh();
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setUploading(false);
      }
    },
    [client, refresh],
  );

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

  return (
    <main className="flex min-h-screen bg-paper-50 text-paper-900">
      <DashboardRail
        totalCount={documents?.length ?? 0}
        pendingCount={pending.length}
        readyCount={ready.length}
        reader={readerName(session)}
        onUpload={upload}
        uploading={uploading}
      />

      <section className="min-w-0 flex-1 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-7">
          <DashboardHeader
            reader={readerName(session)}
            query={query}
            onQuery={setQuery}
            showSearch={hasDocuments}
          />

          {error && <p className="t-body-s rounded-md bg-wine-50 px-4 py-3 text-error">{error}</p>}

          {documents === null ? (
            <DashboardLoading />
          ) : isFilteredEmpty ? (
            <FilteredEmpty query={query} />
          ) : !hasDocuments ? (
            <DropDashboard uploading={uploading} onUpload={upload} />
          ) : (
            <DashboardContent
              inProgress={inProgress.slice(0, 3)}
              recent={recent.slice(0, 6)}
              pending={pending}
              onUpload={upload}
              uploading={uploading}
              onOpen={(doc) => navigate(`/read/${doc.id}`)}
              onRename={setRenameTarget}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </section>

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
        <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2">
          <Toast iconStart={<Icons.Check size={18} color="var(--success)" />}>{toast}</Toast>
        </div>
      )}
    </main>
  );
}

function DashboardRail({
  totalCount,
  pendingCount,
  readyCount,
  reader,
  uploading,
  onUpload,
}: {
  totalCount: number;
  pendingCount: number;
  readyCount: number;
  reader: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const nav = [
    { icon: Icons.Home, name: "Home", active: true },
    { icon: Icons.Library, name: "Library", count: totalCount },
    { icon: Icons.Sparkles, name: "Conversations", count: 0 },
    { icon: Icons.Highlight, name: "Highlights", count: 0 },
    { icon: Icons.Note, name: "Notes" },
    { icon: Icons.Search, name: "Search" },
  ];
  const collections = [
    { name: "Processed", dot: "var(--hl-green)", count: readyCount },
    { name: "In progress", dot: "var(--hl-yellow)", count: pendingCount },
    { name: "Book notes", dot: "var(--hl-pink)", count: 0 },
    { name: "Research", dot: "var(--hl-blue)", count: 0 },
  ];

  return (
    <aside className="hidden w-[230px] shrink-0 flex-col gap-5 border-r border-paper-200 px-[18px] py-6 lg:flex">
      <Wordmark size="md" />
      <UploadButton uploading={uploading} onFile={onUpload} />

      <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
        {nav.map((item) => (
          <button
            key={item.name}
            type="button"
            className={[
              "flex items-center gap-2.5 rounded-md border-0 px-3 py-2 text-left transition-colors",
              item.active ? "bg-paper-100 text-paper-900" : "bg-transparent text-paper-700",
            ].join(" ")}
          >
            <item.icon size={18} color={item.active ? "var(--paper-900)" : "var(--paper-600)"} />
            <span className="t-label-m flex-1">{item.name}</span>
            {item.count !== undefined && (
              <span className="font-mono text-[11px] text-paper-500">{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="h-px bg-paper-200" />

      <div>
        <div className="t-label-s mb-2.5 px-3 text-paper-500">COLLECTIONS</div>
        <div className="flex flex-col gap-0.5">
          {collections.map((collection) => (
            <div key={collection.name} className="flex items-center gap-2.5 rounded-md px-3 py-2">
              <span className="h-2 w-2 rounded-full" style={{ background: collection.dot }} />
              <span className="t-body-m min-w-0 flex-1 truncate text-paper-700">
                {collection.name}
              </span>
              <span className="font-mono text-[11px] text-paper-500">{collection.count}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => authClient.signOut()}
        className="mt-auto flex items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-paper-700 hover:bg-paper-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-200 text-[12px] font-medium uppercase">
          {reader.slice(0, 1)}
        </span>
        <span className="t-body-m min-w-0 flex-1 truncate">{reader}</span>
        <Icons.Settings size={16} color="var(--paper-500)" />
      </button>
    </aside>
  );
}

function DashboardHeader({
  reader,
  query,
  onQuery,
  showSearch,
}: {
  reader: string;
  query: string;
  onQuery: (value: string) => void;
  showSearch: boolean;
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="t-label-s text-paper-500">{dayLabel()}</div>
        <h1 className="mt-1 font-display text-[40px] font-normal leading-[1.05] tracking-normal text-paper-900 lg:text-[44px]">
          Good evening, {reader}.
        </h1>
      </div>
      {showSearch ? (
        <div className="relative w-full lg:w-80">
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search across everything..."
            iconEnd={<Icons.Search size={18} color="var(--paper-500)" />}
          />
        </div>
      ) : null}
    </header>
  );
}

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-7">
      <Skeleton height={72} className="rounded-xl" />
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} height={126} className="rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={248} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function DashboardContent({
  inProgress,
  recent,
  pending,
  uploading,
  onUpload,
  onOpen,
  onRename,
  onDelete,
}: {
  inProgress: Document[];
  recent: Document[];
  pending: Document[];
  uploading: boolean;
  onUpload: (file: File) => void;
  onOpen: (doc: Document) => void;
  onRename: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <QuickAdd uploading={uploading} onUpload={onUpload} />

      {pending.length > 0 && (
        <section>
          <SectionHeading title="Processing" meta={`${pending.length} queued`} />
          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {pending.slice(0, 3).map((doc) => (
              <ProgressCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading
          title="Pick up where you left off"
          meta={`${inProgress.length} in progress`}
        />
        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {inProgress.length > 0 ? (
            inProgress.map((doc) => (
              <ContinueCard
                key={doc.id}
                doc={doc}
                onOpen={() => onOpen(doc)}
                onRename={() => onRename(doc)}
                onDelete={() => onDelete(doc)}
              />
            ))
          ) : (
            <Card className="px-5 py-6 xl:col-span-3">
              <p className="t-body-m text-paper-600">
                Open a document and Bainder will keep your place here.
              </p>
            </Card>
          )}
        </div>
      </section>

      <section>
        <SectionHeading title="Recently added" meta={`See all ${recent.length}`} />
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {recent.map((doc) => (
            <RecentDocumentCard
              key={doc.id}
              doc={doc}
              onOpen={() => onOpen(doc)}
              onRename={() => onRename(doc)}
              onDelete={() => onDelete(doc)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function DropDashboard({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="flex min-h-[560px] flex-col gap-7">
      <section className="flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-paper-300 bg-paper-100 px-8 py-14 text-center">
        <div className="pointer-events-none relative mb-6 hidden h-24 w-full max-w-xl md:block">
          <FaintBook title="The Book of Art" className="left-6 rotate-[-8deg]" />
          <FaintBook title="Ladybird" tone="var(--hl-pink)" className="right-8 rotate-[6deg]" />
          <span className="absolute bottom-0 left-32 h-[70px] w-[52px] rotate-[4deg] rounded bg-paper-50 opacity-40 shadow-sm" />
          <span className="absolute bottom-2 right-36 h-[70px] w-[52px] rotate-[-5deg] rounded bg-paper-200 opacity-40 shadow-sm" />
        </div>

        <UploadDropSurface uploading={uploading} onFile={onUpload} />

        <div className="mt-7 grid w-full max-w-2xl gap-3 md:grid-cols-3">
          <ImportHint icon={Icons.BookOpen} label="From your device" />
          <ImportHint icon={Icons.Sparkles} label="Grounded answers" />
          <ImportHint icon={Icons.Note} label="Notes that connect" />
        </div>
      </section>
    </div>
  );
}

function FilteredEmpty({ query }: { query: string }) {
  return (
    <Card className="px-6 py-10 text-center">
      <Icons.Search size={24} color="var(--paper-500)" />
      <h2 className="t-display-s mt-4">No matches</h2>
      <p className="t-body-m mt-2 text-paper-600">Nothing matches "{query}".</p>
    </Card>
  );
}

function QuickAdd({ uploading, onUpload }: { uploading: boolean; onUpload: (file: File) => void }) {
  return (
    <UploadDropTarget
      compact
      uploading={uploading}
      onFile={onUpload}
      className="rounded-xl bg-paper-100 px-4 py-3"
    >
      {({ browse, dragging }) => (
        <>
          <Icons.Plus size={18} color="var(--paper-700)" />
          <span className="t-body-m min-w-0 flex-1 truncate text-paper-600">
            {dragging ? "Release to upload" : "Drop an EPUB, or browse files to add something new."}
          </span>
          <ChipButton onClick={browse}>{uploading ? "Uploading..." : "Browse files"}</ChipButton>
        </>
      )}
    </UploadDropTarget>
  );
}

function UploadDropSurface({
  uploading,
  onFile,
}: {
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <UploadDropTarget uploading={uploading} onFile={onFile} className="w-full max-w-[560px]">
      {({ browse, dragging }) => (
        <div className="flex w-full flex-col items-center">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              browse();
            }}
            className="flex h-16 w-16 items-center justify-center rounded-full border-0 bg-paper-50 shadow-md"
          >
            <Icons.Plus size={28} color="var(--paper-800)" />
          </button>
          <h2 className="mt-5 font-display text-[28px] font-medium leading-tight tracking-normal text-paper-900">
            {dragging ? "Release to upload" : "Drop anything you want to read"}
          </h2>
          <p className="t-body-l mt-2 text-paper-700">
            EPUB files today. PDF, articles, and links are next.
          </p>
          <div className="mt-5 flex w-full max-w-[520px] items-center gap-2 rounded-full border border-paper-300 bg-paper-50 p-1.5 shadow-sm">
            <Icons.Search size={16} color="var(--paper-500)" className="ml-3" />
            <span className="t-body-m min-w-0 flex-1 truncate text-left text-paper-500">
              Paste a link soon...
            </span>
            <Button size="sm" disabled={uploading} onClick={browse}>
              {uploading ? "Uploading..." : "Import"}
            </Button>
          </div>
        </div>
      )}
    </UploadDropTarget>
  );
}

function UploadButton({ uploading, onFile }: { uploading: boolean; onFile: (file: File) => void }) {
  return (
    <UploadDropTarget uploading={uploading} onFile={onFile}>
      {({ browse }) => (
        <Button
          size="md"
          iconStart={<Icons.Plus size={16} />}
          onClick={browse}
          className="w-full justify-start"
        >
          {uploading ? "Uploading..." : "Add to library"}
        </Button>
      )}
    </UploadDropTarget>
  );
}

function UploadDropTarget({
  compact,
  uploading,
  onFile,
  className = "",
  children,
}: {
  compact?: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
  className?: string;
  children: (args: { browse: () => void; dragging: boolean }) => React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);

  const browse = () => inputRef.current?.click();
  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) onFile(file);
  };
  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={compact ? undefined : browse}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          browse();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      aria-label="Upload a document"
      className={[
        "transition-colors",
        compact ? "flex items-center gap-3" : "cursor-pointer",
        dragging ? "border-wine-700 bg-wine-50" : "",
        uploading ? "pointer-events-none opacity-70" : "",
        className,
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {children({ browse, dragging })}
    </div>
  );
}

function SectionHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="m-0 font-display text-[22px] font-medium leading-tight tracking-normal text-paper-900">
        {title}
      </h2>
      <span className="t-body-m text-paper-500">{meta}</span>
    </div>
  );
}

function ContinueCard({
  doc,
  onOpen,
  onRename,
  onDelete,
}: {
  doc: Document;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const subtitle = progressLabel(doc) ?? doc.originalFilename;
  return (
    <Card className="group flex items-center gap-4 px-4 py-4">
      <button type="button" onClick={onOpen} className="contents text-left">
        <DocumentCover doc={doc} width={52} height={70} />
        <div className="min-w-0 flex-1">
          <div className="t-label-s mb-1 text-paper-500">{KIND_LABEL[doc.kind]}</div>
          <div className="t-label-l truncate text-paper-900">{doc.title}</div>
          <div className="t-body-s mt-1 truncate text-paper-500">{subtitle}</div>
          <ProgressLine doc={doc} />
        </div>
      </button>
      <KebabMenu onRename={onRename} onDelete={onDelete} />
    </Card>
  );
}

function ProgressCard({ doc }: { doc: Document }) {
  return (
    <Card className="flex items-center gap-4 px-4 py-4">
      <DocumentCover doc={doc} width={52} height={70} />
      <div className="min-w-0 flex-1">
        <div className="t-label-l truncate text-paper-900">{doc.title}</div>
        <div className="t-body-s mt-1 text-paper-500">
          {doc.status === "failed" ? (doc.errorReason ?? "Failed") : "Processing..."}
        </div>
      </div>
      <Chip variant="outline">{KIND_LABEL[doc.kind]}</Chip>
    </Card>
  );
}

function RecentDocumentCard({
  doc,
  onOpen,
  onRename,
  onDelete,
}: {
  doc: Document;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="relative border-0 bg-transparent p-0 text-left"
      >
        <DocumentCover doc={doc} fill />
      </button>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="t-label-m line-clamp-2 text-paper-900">{doc.title}</div>
          <div className="t-body-s mt-1 truncate text-[11px] text-paper-500">
            {formatRelativeTime(doc.createdAt)}
          </div>
        </div>
        <KebabMenu onRename={onRename} onDelete={onDelete} compact />
      </div>
    </div>
  );
}

function DocumentCover({
  doc,
  width,
  height,
  fill,
}: {
  doc: Document;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
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

  if (fill) {
    return (
      <BookCover
        width="100%"
        height="auto"
        src={coverSrc ?? undefined}
        background={KIND_GRADIENT[doc.kind]}
        alt=""
        className="aspect-[0.66/1] w-full shadow-sm"
      />
    );
  }

  return (
    <BookCover
      width={width ?? 44}
      height={height ?? 60}
      src={coverSrc ?? undefined}
      background={KIND_GRADIENT[doc.kind]}
      alt=""
      className="shrink-0 shadow-sm"
    />
  );
}

function ProgressLine({ doc }: { doc: Document }) {
  const progress = doc.progress ? Math.min(92, 18 + doc.progress.epubChapterOrder * 7) : 12;
  return (
    <>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-paper-200">
        <div className="h-full rounded-full bg-paper-900" style={{ width: `${progress}%` }} />
      </div>
      <div className="t-body-s mt-1 text-[11px] text-paper-500">
        {doc.progress ? "Continue reading" : "Ready to begin"}
      </div>
    </>
  );
}

function FaintBook({
  title,
  className,
  tone = "var(--hl-blue)",
}: {
  title: string;
  className: string;
  tone?: string;
}) {
  return (
    <div
      className={`absolute top-0 flex h-[92px] w-[66px] items-end rounded p-2 text-left font-display text-[10px] font-medium leading-tight text-paper-900 opacity-40 shadow-sm ${className}`}
      style={{ background: tone }}
    >
      {title}
    </div>
  );
}

function ImportHint({ icon: Icon, label }: { icon: typeof Icons.BookOpen; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-paper-600">
      <Icon size={14} color="var(--paper-600)" />
      <span className="t-body-s">{label}</span>
    </div>
  );
}

function ChipButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="t-label-m rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-paper-700 hover:border-paper-500"
    >
      {children}
    </button>
  );
}

function KebabMenu({
  onRename,
  onDelete,
  compact,
}: {
  onRename?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <IconButton
        aria-label="More actions"
        size={compact ? "sm" : "md"}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icons.MoreVertical size={16} />
      </IconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-paper-200 bg-paper-50 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {onRename && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-paper-100"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              <Icons.Pencil size={16} />
              Rename
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-wine-700 hover:bg-wine-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Icons.Trash size={16} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== doc.title && !saving;

  return (
    <div
      role="dialog"
      aria-label="Rename document"
      className="fixed inset-0 z-30 flex flex-col justify-end"
      style={{ background: "rgba(20, 15, 10, 0.35)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-2xl">
        <Sheet>
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="t-label-l">Rename</span>
            <IconButton aria-label="Close" size="sm" onClick={onCancel}>
              <Icons.Close size={14} />
            </IconButton>
          </div>

          <Input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="mt-3"
            maxLength={200}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canSave) {
                event.preventDefault();
                void (async () => {
                  setSaving(true);
                  try {
                    await onSave(trimmed);
                  } finally {
                    setSaving(false);
                  }
                })();
              }
            }}
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={async () => {
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
          </div>
        </Sheet>
      </div>
    </div>
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-label="Delete document"
      className="fixed inset-0 z-30 flex flex-col justify-end"
      style={{ background: "rgba(20, 15, 10, 0.35)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-2xl">
        <Sheet>
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="t-label-l">Delete document?</span>
            <IconButton aria-label="Close" size="sm" onClick={onCancel}>
              <Icons.Close size={14} />
            </IconButton>
          </div>

          <p className="t-body-m mt-2 text-paper-700">
            <span className="font-medium">"{doc.title}"</span> and all of its highlights will be
            permanently removed. This can't be undone.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={working}>
              Cancel
            </Button>
            <Button
              variant="wine"
              disabled={working}
              onClick={async () => {
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
          </div>
        </Sheet>
      </div>
    </div>
  );
}
