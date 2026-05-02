import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookCover,
  Button,
  Card,
  Chip,
  Hairline,
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

const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
};

const KIND_GRADIENT: Record<Document["kind"], string> = {
  epub: "linear-gradient(160deg, oklch(60% 0.18 35), oklch(40% 0.16 30))",
};

const COVER_W = 44;
const COVER_H = 60;

const ACCEPT_ATTR = ".epub,application/epub+zip";

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

export function Library() {
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
      if (res.data) setDocuments(res.data.items);
      else setError("Failed to load documents");
    } catch (err) {
      setError(String(err));
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while any document is still processing.
  useEffect(() => {
    if (!documents) return;
    const hasPending = documents.some((d) => d.status === "uploading" || d.status === "processing");
    if (!hasPending) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [documents, refresh]);

  // Auto-dismiss toast.
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
  const isEmpty = documents !== null && documents.length === 0;
  const isFilteredEmpty = filtered !== null && filtered.length === 0 && !isEmpty;

  return (
    <main className="min-h-screen bg-paper-50 text-paper-900">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/library" className="text-paper-900" aria-label="Bainder library">
          <Wordmark size="md" />
        </Link>
        <Button variant="ghost" size="sm" onClick={() => authClient.signOut()}>
          Sign out
        </Button>
      </header>

      <Hairline className="mx-auto max-w-3xl" />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="t-display-l">Library</h1>
        <p className="t-body-l mt-2 text-paper-700">
          Drop in an EPUB. Bainder extracts and organises your books.
        </p>

        <div className="mt-8">
          <UploadZone compact={!isEmpty} uploading={uploading} onFile={upload} />
        </div>

        {documents !== null && documents.length > 0 && (
          <div className="mt-8">
            <Input
              placeholder="Search your library…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              iconStart={<Icons.Search size={18} />}
              aria-label="Search library"
            />
          </div>
        )}

        {error && <p className="t-body-s mt-4 text-error">{error}</p>}

        {documents === null ? (
          <ul className="mt-10 flex flex-col gap-3" aria-label="Loading documents">
            {Array.from({ length: 4 }, (_, i) => (
              <DocumentRowSkeleton key={i} />
            ))}
          </ul>
        ) : isFilteredEmpty ? (
          <p className="t-body-m mt-10 text-paper-500">No documents match "{query}".</p>
        ) : isEmpty ? null : (
          <>
            {pending.length > 0 && (
              <section className="mt-10">
                <h2 className="t-label-s text-paper-600">Processing</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {pending.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </ul>
              </section>
            )}

            {ready.length > 0 && (
              <section className="mt-10">
                <h2 className="t-label-s text-paper-600">Ready to read</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {ready.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onOpen={() => navigate(`/read/${doc.id}`)}
                      onRename={() => setRenameTarget(doc)}
                      onDelete={() => setDeleteTarget(doc)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <Toast iconStart={<Icons.Check size={18} color="var(--success)" />}>{toast}</Toast>
        </div>
      )}
    </main>
  );
}

function UploadZone({
  compact,
  uploading,
  onFile,
}: {
  compact: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);

  const browse = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const padding = compact ? "px-6 py-6" : "px-8 py-16";
  const align = compact ? "" : "text-center";
  const dragCls = dragging
    ? "border-wine-700 bg-wine-50"
    : "border-paper-300 bg-paper-100 hover:border-paper-500";

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex cursor-pointer items-center gap-6 rounded-2xl border-2 border-dashed transition-colors ${padding} ${align} ${dragCls} ${
        compact ? "" : "flex-col"
      }`}
      onClick={browse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          browse();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Upload a document"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-paper-50 ${
          compact ? "h-12 w-12" : "h-20 w-20"
        }`}
      >
        <Icons.Plus size={compact ? 22 : 32} color="var(--paper-700)" />
      </div>

      <div className={compact ? "flex-1" : ""}>
        <div className={compact ? "t-label-l" : "t-display-s"}>
          {dragging ? "Release to upload" : compact ? "Add a document" : "Drop a file to begin"}
        </div>
        <div className="t-body-s mt-1 text-paper-600">EPUB · up to 100 MB</div>
      </div>

      {compact && (
        <Button
          variant="wine"
          size="md"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            browse();
          }}
        >
          {uploading ? "Uploading…" : "Browse"}
        </Button>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  onOpen,
  onRename,
  onDelete,
}: {
  doc: Document;
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const interactive = doc.status === "processed";
  const subtitle = progressLabel(doc) ?? doc.originalFilename;
  const subtitleEmphasised = progressLabel(doc) !== null;

  return (
    <li>
      <Card
        className={`flex items-center justify-between gap-4 px-5 py-4 ${
          interactive ? "cursor-pointer hover:bg-paper-100" : ""
        }`}
        onClick={interactive ? onOpen : undefined}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen?.();
                }
              }
            : undefined
        }
      >
        <DocumentCover doc={doc} />
        <div className="min-w-0 flex-1">
          <div className="t-label-l truncate text-paper-900">{doc.title}</div>
          <div
            className={`t-body-s mt-1 truncate ${
              subtitleEmphasised ? "text-paper-700" : "text-paper-500"
            }`}
          >
            {subtitle}
          </div>
        </div>
        <Chip variant="outline">{KIND_LABEL[doc.kind]}</Chip>
        {doc.status === "failed" && (
          <span className="t-body-s text-error">{doc.errorReason ?? "Failed"}</span>
        )}
        {doc.status === "processing" && (
          <span className="t-body-s text-paper-500">Processing…</span>
        )}
        {interactive && (onRename || onDelete) && (
          <KebabMenu onRename={onRename} onDelete={onDelete} />
        )}
      </Card>
    </li>
  );
}

function KebabMenu({ onRename, onDelete }: { onRename?: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icons.MoreVertical size={16} />
      </IconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-paper-200 bg-paper-50 shadow-lg"
          onClick={(e) => e.stopPropagation()}
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-2xl">
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
            onChange={(e) => setValue(e.target.value)}
            className="mt-3"
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSave) {
                e.preventDefault();
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
              {saving ? "Saving…" : "Save"}
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-2xl">
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
              {working ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Sheet>
      </div>
    </div>
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
      .catch(() => {
        // Cover is best-effort; fall back to gradient.
      });
    return () => {
      cancelled = true;
    };
  }, [client, baseUrl, doc.id, doc.kind, doc.status]);

  return (
    <BookCover
      width={COVER_W}
      height={COVER_H}
      src={coverSrc ?? undefined}
      background={KIND_GRADIENT[doc.kind]}
      alt=""
      className="shrink-0"
    />
  );
}

function DocumentRowSkeleton() {
  return (
    <li>
      <Card className="flex items-center gap-4 px-5 py-4">
        <Skeleton width={COVER_W} height={COVER_H} className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={12} />
        </div>
        <Skeleton shape="pill" width={56} height={24} />
      </Card>
    </li>
  );
}
