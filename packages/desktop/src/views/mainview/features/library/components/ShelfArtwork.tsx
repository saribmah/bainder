import type { Shelf } from "@baindar/sdk";
import { shelfDescription, shelfItemNoun, shelfPaletteColors } from "../utils/shelf";

export function SpineFan({ shelf, size = 48 }: { shelf: Shelf; size?: number }) {
  const colors = shelfPaletteColors(shelf);
  const width = size;
  const height = size * 1.4;

  return (
    <div aria-hidden className="relative shrink-0" style={{ width: width * 1.5, height }}>
      {colors.map((background, index) => {
        const offset = (index - 1) * (width * 0.18);
        const rotation = (index - 1) * 6;
        return (
          <span
            key={`${background}-${index}`}
            className="absolute left-1/2 top-0 block border"
            style={{
              width: width * 0.62,
              height,
              background,
              borderColor: "rgba(0,0,0,0.10)",
              borderRadius: "2px 3px 3px 2px",
              boxShadow: "0 4px 10px rgba(20,15,10,0.14), inset 1px 0 0 rgba(255,255,255,0.08)",
              transform: `translateX(calc(-50% + ${offset}px)) rotate(${rotation}deg)`,
              transformOrigin: "bottom center",
              zIndex: index === 1 ? 2 : 1,
            }}
          >
            <span className="mt-2 block h-1.5 bg-black/10" />
            <span className="mt-1 block h-1.5 bg-black/10" />
          </span>
        );
      })}
    </div>
  );
}

export function ShelfCard({
  shelf,
  active = false,
  compact = false,
  onClick,
}: {
  shelf: Shelf;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const description = shelfDescription(shelf);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex shrink-0 flex-col gap-2.5 rounded-[14px] border border-bd-border text-left transition-colors hover:bg-bd-surface-raised",
        active ? "bg-bd-surface-raised" : "bg-bd-bg",
        compact ? "min-w-[180px] p-3" : "min-w-[220px] p-4",
      ].join(" ")}
    >
      <span className="flex items-end justify-between" style={{ height: compact ? 70 : 86 }}>
        <SpineFan shelf={shelf} size={compact ? 38 : 48} />
        <span className="font-mono text-[11px] text-bd-fg-muted">{shelf.itemCount}</span>
      </span>
      <span>
        <span
          className={[
            "block font-display font-medium leading-[1.2] text-bd-fg",
            compact ? "text-[15px]" : "text-[17px]",
          ].join(" ")}
        >
          {shelf.name}
        </span>
        {description && !compact && (
          <span className="t-body-s mt-0.5 line-clamp-2 text-bd-fg-muted">{description}</span>
        )}
        {shelf.kind === "smart" && !compact && (
          <span className="t-body-s mt-0.5 block text-bd-fg-muted">
            Smart shelf · {shelf.itemCount} {shelfItemNoun(shelf.itemCount)}
          </span>
        )}
      </span>
    </button>
  );
}
