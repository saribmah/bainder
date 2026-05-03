import { Button, Icons } from "@bainder/ui";
import { ChipButton } from "./ChipButton";
import { UploadDropTarget } from "./UploadDropTarget";

export function QuickAdd({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
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

export function UploadDropSurface({
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
