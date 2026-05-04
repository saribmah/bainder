import { createElement, type HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type WordmarkSize = "sm" | "md" | "lg";
export type WordmarkElement = "span" | "div" | "h1";

export type WordmarkProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: WordmarkElement;
  size?: WordmarkSize;
  color?: string;
};

const sizeStyle: Record<WordmarkSize, { fontSize: number; letterSpacing: string }> = {
  sm: { fontSize: 18, letterSpacing: "-0.035em" },
  md: { fontSize: 22, letterSpacing: "-0.04em" },
  lg: { fontSize: 56, letterSpacing: "-0.04em" },
};

export function Wordmark({
  as = "span",
  size = "md",
  color = "var(--bd-fg)",
  className,
  style,
  ...rest
}: WordmarkProps) {
  const sizing = sizeStyle[size];

  return createElement(as, {
    className: cx("bd-wordmark", className),
    ...rest,
    style: {
      display: "inline-block",
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: sizing.fontSize,
      fontWeight: 400,
      lineHeight: 1,
      letterSpacing: sizing.letterSpacing,
      fontVariationSettings: '"opsz" 144, "SOFT" 30',
      color,
      ...style,
    },
    children: "baindar",
  });
}
