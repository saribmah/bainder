import type { Document } from "@bainder/sdk";

export function ProgressLine({ doc }: { doc: Document }) {
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
