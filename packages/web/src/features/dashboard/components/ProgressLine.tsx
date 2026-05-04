import type { Document } from "@baindar/sdk";

export function ProgressLine({ doc }: { doc: Document }) {
  // `progressPercent` is in [0, 1]; clamp to the visual range so a 0%
  // bar is still visible and 100% doesn't visually overshoot the chip.
  const pct = doc.progress?.progressPercent;
  const width = pct !== null && pct !== undefined ? Math.min(98, Math.max(6, pct * 100)) : 12;

  return (
    <>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bd-border">
        <div className="h-full rounded-full bg-bd-action" style={{ width: `${width}%` }} />
      </div>
      <div className="t-body-s mt-1 text-[11px] text-bd-fg-muted">
        {doc.progress ? "Continue reading" : "Ready to begin"}
      </div>
    </>
  );
}
