import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type HighlightColor = "pink" | "yellow" | "green" | "blue" | "purple";

export type HighlightProps = HTMLAttributes<HTMLSpanElement> & {
  color?: HighlightColor;
};

const colorClass: Record<HighlightColor, string> = {
  pink: "",
  yellow: "bd-highlight-yellow",
  green: "bd-highlight-green",
  blue: "bd-highlight-blue",
  purple: "bd-highlight-purple",
};

export function Highlight({ color = "pink", className, children, ...rest }: HighlightProps) {
  return (
    <mark className={cx("bd-highlight", colorClass[color], className)} {...rest}>
      {children}
    </mark>
  );
}
