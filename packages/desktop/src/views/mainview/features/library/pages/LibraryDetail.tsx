import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Chip, Icons, Skeleton } from "@bainder/ui";
import type { Document, DocumentManifest, Highlight } from "@bainder/sdk";
import { useProfileName } from "../../profile";
import { KIND_LABEL, HIGHLIGHT_COLOR } from "../constants";
import { LibraryCover } from "../components/LibraryCover";
import { LibraryRail } from "../components/LibraryRail";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useSdk } from "../../../sdk";
import {
  estimateMinutes,
  formatWordCount,
  progressPercent,
  sectionOrderFromKey,
  sourceLabel,
} from "../utils/document";

export function LibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reader = useProfileName();
  const { client } = useSdk();
  const { documents, counts, uploading, uploadDocument } = useLibraryDocuments();
  const [doc, setDoc] = useState<Document | null>(null);
  const [manifest, setManifest] = useState<DocumentManifest | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      client.document.get({ id }),
      client.document.getManifest({ id }),
      client.highlight.list({ documentId: id }),
    ])
      .then(([docRes, manifestRes, highlightRes]) => {
        if (cancelled) return;
        if (!docRes.data) {
          setError("Document not found");
          return;
        }
        setDoc(docRes.data);
        setManifest(manifestRes.data ?? null);
        setHighlights(highlightRes.data?.items ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client, id]);

  const currentOrder = sectionOrderFromKey(doc?.progress?.sectionKey) ?? 0;
  const notes = useMemo(
    () => highlights.filter((highlight) => highlight.note?.trim()),
    [highlights],
  );
  const pct = doc ? progressPercent(doc) : 0;

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6 text-paper-900">
        <div className="text-center">
          <p className="t-body-m text-error">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate("/library")}>
            Back to library
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh min-h-screen overflow-hidden bg-paper-50 text-paper-900">
      <LibraryRail
        totalCount={counts.all}
        highlightsCount={highlights.length}
        reader={reader}
        uploading={uploading}
        onUpload={uploadDocument}
      />

      {!doc ? (
        <DetailSkeleton />
      ) : (
        <section className="flex min-w-0 flex-1 overflow-hidden">
          <aside className="hidden w-[380px] shrink-0 flex-col gap-6 border-r border-paper-200 px-9 py-10 lg:flex">
            <Button
              variant="ghost"
              size="sm"
              iconStart={<Icons.Back size={14} />}
              onClick={() => navigate("/library")}
              className="self-start"
            >
              Library
            </Button>
            <LibraryCover doc={doc} width={220} priority className="self-center" />
            <div className="text-center">
              <div className="t-label-s text-paper-500">{KIND_LABEL[doc.kind]} · EPUB</div>
              <h1 className="t-display-s mt-2 text-paper-900">{doc.title}</h1>
              <div className="t-body-m mt-1 text-paper-700">{sourceLabel(doc, manifest)}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={() => navigate(`/read/${doc.id}`)} className="w-full">
                Continue · {pct}% read
              </Button>
              <Button
                variant="secondary"
                iconStart={<Icons.Sparkles size={14} />}
                onClick={() => navigate(`/read/${doc.id}`)}
                className="w-full text-wine-700"
              >
                Ask Bainder about this book
              </Button>
            </div>
            <Stats manifest={manifest} highlights={highlights.length} currentOrder={currentOrder} />
          </aside>

          <section className="min-w-0 flex-1 overflow-y-auto px-6 py-8 lg:px-14 lg:py-10">
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                iconStart={<Icons.Back size={14} />}
                onClick={() => navigate("/library")}
              >
                Library
              </Button>
              <div className="mt-5 flex gap-5">
                <LibraryCover doc={doc} width={116} priority className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="t-label-s text-paper-500">{KIND_LABEL[doc.kind]}</div>
                  <h1 className="t-display-xs mt-1 text-paper-900">{doc.title}</h1>
                  <div className="t-body-s mt-1 text-paper-600">{sourceLabel(doc, manifest)}</div>
                  <Button size="sm" className="mt-4" onClick={() => navigate(`/read/${doc.id}`)}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-1 border-b border-paper-200 lg:mt-0">
              {[
                ["Contents", manifest?.sections.length ?? 0],
                ["About", null],
                ["Notes", notes.length],
                ["Highlights", highlights.length],
              ].map(([name, count], index) => (
                <button
                  key={name}
                  type="button"
                  className={[
                    "flex items-center gap-1.5 border-0 border-b-2 bg-transparent px-4 py-3 font-ui text-sm font-semibold",
                    index === 0
                      ? "border-paper-900 text-paper-900"
                      : "border-transparent text-paper-500",
                  ].join(" ")}
                >
                  {name}
                  {typeof count === "number" && (
                    <span className="font-mono text-[11px] font-normal text-paper-500">
                      · {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="grid gap-8 pt-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
              <Contents manifest={manifest} currentOrder={currentOrder} />
              <RecentNotes notes={notes} />
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

function Stats({
  manifest,
  highlights,
  currentOrder,
}: {
  manifest: DocumentManifest | null;
  highlights: number;
  currentOrder: number;
}) {
  const stats = [
    { value: manifest?.chapterCount ?? "—", label: "chapters" },
    { value: highlights, label: "highlights" },
    { value: manifest ? formatWordCount(manifest.wordCount) : "—", label: "length" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 border-y border-paper-200 py-4">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div className="font-display text-[22px] font-medium text-paper-900">{stat.value}</div>
          <div className="t-body-s text-paper-500">{stat.label}</div>
        </div>
      ))}
      <div className="col-span-3 text-center">
        <Chip variant="outline">Current chapter · {currentOrder + 1}</Chip>
      </div>
    </div>
  );
}

function Contents({
  manifest,
  currentOrder,
}: {
  manifest: DocumentManifest | null;
  currentOrder: number;
}) {
  if (!manifest) return <Skeleton height={360} className="rounded-xl" />;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="t-label-s text-paper-500">Contents</span>
        <span className="t-body-s text-paper-500">
          {manifest.chapterCount} chapters · {formatWordCount(manifest.wordCount)}
        </span>
      </div>
      <div>
        {manifest.sections.map((section) => {
          const current = section.order === currentOrder;
          const read = section.order < currentOrder;
          return (
            <div
              key={section.sectionKey}
              className={[
                "flex items-center gap-4 border-b border-paper-200 py-3",
                current ? "rounded-md bg-paper-100 px-3" : "",
              ].join(" ")}
            >
              <span className="min-w-6 font-mono text-[11px] text-paper-500">
                {String(section.order + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={["t-label-m line-clamp-2", current ? "font-semibold" : ""].join(" ")}
                >
                  {section.title || `Section ${section.order + 1}`}
                </div>
                <div className="t-body-s mt-0.5 text-[11px] text-paper-500">
                  {estimateMinutes(section)}
                </div>
              </div>
              {current && <Chip variant="active">Continue</Chip>}
              {read && !current && <Icons.Check size={14} color="var(--success)" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecentNotes({ notes }: { notes: Highlight[] }) {
  return (
    <aside className="border-paper-200 xl:border-l xl:pl-7">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="t-label-s text-paper-500">Recent notes · {notes.length}</span>
        <span className="t-body-s font-semibold text-wine-700">View all</span>
      </div>
      {notes.length === 0 ? (
        <p className="t-body-m border-t border-paper-200 py-4 text-paper-600">
          Highlights with notes will collect here as you read.
        </p>
      ) : (
        notes.slice(0, 5).map((note) => (
          <div key={note.id} className="flex flex-col gap-1.5 border-b border-paper-200 py-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: HIGHLIGHT_COLOR[note.color] }}
              />
              <span className="t-body-s text-[11px] text-paper-500">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>
            <blockquote
              className="m-0 border-l-2 pl-3 font-reading text-[13px] leading-6 text-paper-900"
              style={{ borderColor: HIGHLIGHT_COLOR[note.color] }}
            >
              "{note.textSnippet}"
            </blockquote>
            {note.note && (
              <p className="t-body-s pl-3 text-paper-700">
                <span className="italic">{note.note}</span>
              </p>
            )}
          </div>
        ))
      )}
    </aside>
  );
}

function DetailSkeleton() {
  return (
    <section className="flex min-w-0 flex-1 gap-8 p-10">
      <div className="hidden w-[300px] lg:block">
        <Skeleton className="aspect-[0.66/1] w-[220px] rounded-[4px]" />
        <Skeleton width="80%" height={28} className="mx-auto mt-6" />
        <Skeleton width="55%" height={16} className="mx-auto mt-3" />
      </div>
      <div className="flex-1">
        <Skeleton width="60%" height={42} />
        <Skeleton height={360} className="mt-8 rounded-xl" />
      </div>
    </section>
  );
}
