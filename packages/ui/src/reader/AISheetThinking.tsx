import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type AISheetThinkingProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  status?: string;
};

export function AISheetThinking({ status, className, ...rest }: AISheetThinkingProps) {
  return (
    <div role="status" aria-live="polite" className={cx("bd-thinking", className)} {...rest}>
      <span aria-hidden className="bd-thinking-dot" />
      <span aria-hidden className="bd-thinking-dot bd-thinking-dot-2" />
      <span aria-hidden className="bd-thinking-dot bd-thinking-dot-3" />
      {status && <span className="bd-thinking-status">{status}</span>}
    </div>
  );
}
