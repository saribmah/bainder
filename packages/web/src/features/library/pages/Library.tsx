import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChipButton, Icons, Input, Skeleton, Toast } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { useProfileName } from "../../profile";
import { FILTER_LABEL, type LibraryFilter } from "../constants";
import { LibraryActionsMenu } from "../components/LibraryActionsMenu";
import { LibraryCover } from "../components/LibraryCover";
import { DeleteDialog, RenameDialog } from "../components/LibraryDialogs";
import { LibraryRail } from "../components/LibraryRail";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useLibraryHighlights } from "../hooks/useLibraryHighlights";
import { progressPercent, sourceLabel, statusLabel } from "../utils/document";

const filters: LibraryFilter[] = ["all", "books", "pdfs", "articles"];

export function Library() {
  const reader = useProfileName();
  const navigate = useNavigate();
  const [renameTarget, setRenameTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const {
    documents,
    filteredDocuments,
    counts,
    error,
    uploading,
    toast,
    query,
    setQuery,
    filter,
    setFilter,
    uploadDocument,
    renameDocument,
    deleteDocument,
  } = useLibraryDocuments();
  const { highlights } = useLibraryHighlights(documents);

  const visible = filteredDocuments ?? [];
  const headingMeta = useMemo(
    () => `Your library · ${counts.all} ${counts.all === 1 ? "item" : "items"}`,
    [counts.all],
  );

  return (
    <main className="flex h-dvh min-h-screen overflow-hidden bg-paper-50 text-paper-900">
      <LibraryRail
        totalCount={counts.all}
        highlightsCount={highlights?.length ?? 0}
        reader={reader}
        uploading={uploading}
        onUpload={uploadDocument}
      />

      <section className="min-w-0 flex-1 overflow-hidden px-6 py-8 lg:px-12">
        <div className="mx-auto flex h-full max-w-7xl flex-col">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="t-label-s text-paper-500">{headingMeta}</div>
              <h1 className="mt-1 font-display text-[clamp(34px,5vw,48px)] font-normal leading-[1.05]">
                Everything you've collected.
              </h1>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter library..."
              iconEnd={<Icons.Search size={18} color="var(--paper-500)" />}
              wrapClassName="w-full lg:w-[320px]"
            />
          </div>

          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <ChipButton
                key={item}
                variant={filter === item ? "active" : "filled"}
                onClick={() => setFilter(item)}
                className="shrink-0"
              >
                {FILTER_LABEL[item]} · {counts[item]}
              </ChipButton>
            ))}
            <div className="min-w-4 flex-1" />
            <span className="t-body-s hidden text-paper-500 sm:inline">Sort</span>
            <ChipButton variant="outline" className="shrink-0">
              Recently added <Icons.Chevron size={12} color="var(--paper-600)" />
            </ChipButton>
          </div>

          {error && (
            <p className="t-body-s mt-4 rounded-md bg-wine-50 px-4 py-3 text-error">{error}</p>
          )}

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pb-8">
            {documents === null ? (
              <LibrarySkeleton />
            ) : visible.length === 0 ? (
              <EmptyLibrary query={query} />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {visible.map((doc) => (
                  <LibraryCard
                    key={doc.id}
                    doc={doc}
                    onOpen={() => {
                      if (doc.status === "processed") navigate(`/library/${doc.id}`);
                    }}
                    onRename={() => setRenameTarget(doc)}
                    onDelete={() => setDeleteTarget(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {renameTarget && (
        <RenameDialog
          doc={renameTarget}
          onCancel={() => setRenameTarget(null)}
          onSave={async (title) => {
            await renameDocument(renameTarget, title);
            setRenameTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          doc={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteDocument(deleteTarget);
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

function LibraryCard({
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
  const pct = progressPercent(doc);
  const finished = doc.status === "processed" && pct >= 100;
  const active = doc.status === "processed" && pct > 0 && pct < 100;

  return (
    <div className="group min-w-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={doc.status !== "processed"}
        className="w-full border-0 bg-transparent p-0 text-left disabled:cursor-default"
      >
        <LibraryCover doc={doc} />
      </button>
      <div className="mt-2 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <div className="t-label-m line-clamp-2 text-paper-900">{doc.title}</div>
          <div className="t-body-s mt-1 truncate text-[11px] text-paper-500">
            {sourceLabel(doc)} · {statusLabel(doc)}
          </div>
          {active && (
            <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-paper-200">
              <div className="h-full rounded-full bg-paper-900" style={{ width: `${pct}%` }} />
            </div>
          )}
          {finished && (
            <div className="mt-1.5 flex items-center gap-1 text-success">
              <Icons.Check size={11} color="var(--success)" />
              <span className="t-body-s text-[10px]">Finished</span>
            </div>
          )}
        </div>
        <LibraryActionsMenu onRename={onRename} onDelete={onDelete} />
      </div>
    </div>
  );
}

function EmptyLibrary({ query }: { query: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-paper-300 bg-paper-100 px-6 text-center">
      <div>
        <h2 className="t-display-s text-paper-900">{query ? "No matches" : "No documents yet"}</h2>
        <p className="t-body-m mt-2 max-w-md text-paper-600">
          {query
            ? "Try a different title or filename."
            : "Use Add to library to import the first EPUB."}
        </p>
      </div>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[0.66/1] w-full rounded-[4px]" />
          <Skeleton width="85%" height={14} className="mt-3" />
          <Skeleton width="55%" height={12} className="mt-2" />
        </div>
      ))}
    </div>
  );
}
