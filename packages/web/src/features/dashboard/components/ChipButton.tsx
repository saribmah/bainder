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
      className="t-label-m rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-paper-700 hover:border-paper-500"
    >
      {children}
    </button>
  );
}
