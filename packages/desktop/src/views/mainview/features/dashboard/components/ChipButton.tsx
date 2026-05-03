import type { MouseEventHandler, ReactNode } from "react";

export function ChipButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="t-label-m rounded-full border border-bd-border-strong bg-bd-bg px-3 py-1.5 text-bd-fg-subtle hover:border-bd-fg-muted"
    >
      {children}
    </button>
  );
}
