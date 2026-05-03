import { Card, Icons } from "@bainder/ui";
import { FaintBook } from "./FaintBook";
import { ImportHint } from "./ImportHint";
import { UploadDropSurface } from "./UploadControls";

export function DropDashboard({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="flex min-h-[560px] flex-col gap-7">
      <section className="flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-bd-border-strong bg-bd-surface-raised px-8 py-14 text-center">
        <div className="pointer-events-none relative mb-6 hidden h-24 w-full max-w-xl md:block">
          <FaintBook title="The Book of Art" className="left-6 rotate-[-8deg]" />
          <FaintBook title="Ladybird" tone="var(--hl-pink)" className="right-8 rotate-[6deg]" />
          <span className="absolute bottom-0 left-32 h-[70px] w-[52px] rotate-[4deg] rounded bg-bd-bg opacity-40 shadow-sm" />
          <span className="absolute bottom-2 right-36 h-[70px] w-[52px] rotate-[-5deg] rounded bg-bd-surface-raised opacity-40 shadow-sm" />
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

export function FilteredEmpty({ query }: { query: string }) {
  return (
    <Card className="px-6 py-10 text-center">
      <Icons.Search size={24} color="var(--bd-fg-muted)" />
      <h2 className="t-display-s mt-4">No matches</h2>
      <p className="t-body-m mt-2 text-bd-fg-subtle">Nothing matches "{query}".</p>
    </Card>
  );
}
