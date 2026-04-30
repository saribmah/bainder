import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type AISheetQuoteProps = HTMLAttributes<HTMLQuoteElement>;

export function AISheetQuote({ className, children, ...rest }: AISheetQuoteProps) {
  return (
    <blockquote className={cx("bd-ai-quote", className)} {...rest}>
      {children}
    </blockquote>
  );
}
