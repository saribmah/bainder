import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Chip, Hairline, IconButton, Icons, Toast } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { authClient } from "../auth/auth.client";
import { useSdk } from "../sdk";

const KIND_LABEL: Record<Document["kind"], string> = {
  epub: "EPUB",
  pdf: "PDF",
  image: "Image",
  text: "Text",
  other: "Other",
};

const ACCEPT_ATTR =
  ".pdf,.epub,.txt,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/epub+zip,text/plain,image/*";

export function Library() {
  const { client } = useSdk();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  const ready = documents?.filter((d) => d.status === "processed") ?? [];
  const pending = documents?.filter((d) => d.status !== "processed") ?? [];
  const isEmpty = documents !== null && documents.length === 0;

  return (
    <main className="min-h-screen bg-paper-50 text-paper-900">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/library" className="t-display-xs text-paper-900">
          bainder
        </Link>
        <Button variant="ghost" size="sm" onClick={() => authClient.signOut()}>
          Sign out
        </Button>
      </header>

      <Hairline className="mx-auto max-w-3xl" />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="t-display-l">Library</h1>
        <p className="t-body-l mt-2 text-paper-700">
          Drop in a PDF, EPUB, image, or text file. Bainder extracts and organises them.
        </p>

        <div className="mt-8">
          <UploadZone compact={!isEmpty} uploading={uploading} onFile={upload} />
        </div>

        {error && <p className="t-body-s mt-4 text-error">{error}</p>}

        {documents === null ? (
          <p className="t-body-m mt-10 text-paper-500">Loading…</p>
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
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>

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
        <div className="t-body-s mt-1 text-paper-600">PDF · EPUB · text · image — up to 100 MB</div>
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

function DocumentRow({ doc, onOpen }: { doc: Document; onOpen?: () => void }) {
  const interactive = doc.status === "processed";
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
        <div className="min-w-0 flex-1">
          <div className="t-label-l truncate text-paper-900">{doc.title}</div>
          <div className="t-body-s mt-1 text-paper-500">{doc.originalFilename}</div>
        </div>
        <Chip variant="outline">{KIND_LABEL[doc.kind]}</Chip>
        {doc.status === "failed" && (
          <span className="t-body-s text-error">{doc.errorReason ?? "Failed"}</span>
        )}
        {doc.status === "processing" && (
          <span className="t-body-s text-paper-500">Processing…</span>
        )}
        {interactive && (
          <IconButton aria-label="Open" size="sm">
            <Icons.Chevron size={16} />
          </IconButton>
        )}
      </Card>
    </li>
  );
}
