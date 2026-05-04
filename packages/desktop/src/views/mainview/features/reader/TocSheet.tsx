import { useEffect, useMemo, useRef } from "react";
import { Icons, Sheet, useTheme } from "@baindar/ui";
import type { DocumentSectionSummary, EpubTocItem } from "@baindar/sdk";

export type TocSheetProps = {
  toc: ReadonlyArray<EpubTocItem>;
  sections: ReadonlyArray<DocumentSectionSummary>;
  currentOrder: number;
  onJump: (order: number) => void;
  onClose: () => void;
};

export function TocSheet({ toc, sections, currentOrder, onJump, onClose }: TocSheetProps) {
  const { theme } = useTheme();
  const sheetRef = useRef<HTMLDivElement>(null);

  // fileHref → chapter order. Chapter `href` is the file path, TOC `fileHref`
  // is the same file path (with anchor stripped). We pick the *first* match
  // for a file so anchors deeper in the chapter still jump to the chapter.
  const orderByFile = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of sections) {
      if (!map.has(ch.href)) map.set(ch.href, ch.order);
    }
    return map;
  }, [sections]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Trap initial focus on the sheet container so Escape works without
  // requiring a click first.
  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  const backdropBg = theme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(20, 15, 10, 0.35)";

  const itemColor =
    theme === "dark" ? "text-night-50" : theme === "sepia" ? "text-sepia-900" : "text-bd-fg";
  const itemMutedColor =
    theme === "dark" ? "text-night-200" : theme === "sepia" ? "text-sepia-700" : "text-bd-fg-muted";
  const itemActiveBg =
    theme === "dark"
      ? "bg-[oklch(28%_0.012_240)]"
      : theme === "sepia"
        ? "bg-sepia-100"
        : "bg-bd-surface-raised";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Table of contents"
      className="fixed inset-0 z-20 flex flex-col justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ background: backdropBg }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-2xl outline-none"
      >
        <Sheet style={{ maxHeight: "70vh" }}>
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <span className="t-label-l">Contents</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`bd-floating-toolbar-btn ${itemMutedColor}`}
              style={{ width: 32, height: 32 }}
            >
              <Icons.Close size={16} />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto" style={{ marginRight: -8, paddingRight: 8 }}>
            {toc.map((item) => {
              const order = orderByFile.get(item.fileHref);
              const reachable = order !== undefined;
              const active = reachable && order === currentOrder;
              return (
                <li key={`${item.index}-${item.href}`}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => {
                      if (reachable) onJump(order);
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left transition-colors ${active ? itemActiveBg : ""}`}
                    style={{ paddingLeft: 12 + item.depth * 16 }}
                  >
                    <span className={`t-body-m ${reachable ? itemColor : itemMutedColor}`}>
                      {item.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      </div>
    </div>
  );
}
