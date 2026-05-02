import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";
import { Monogram, type MonogramSize } from "./Monogram.tsx";
import { Wordmark, type WordmarkSize } from "./Wordmark.tsx";

export type BrandLockupSize = "sm" | "md" | "lg";
export type BrandLockupOrientation = "horizontal" | "stacked";

export type BrandLockupProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  size?: BrandLockupSize;
  orientation?: BrandLockupOrientation;
  wordmarkColor?: string;
  monogramBackgroundColor?: string;
  monogramColor?: string;
  label?: string;
};

const gapBySize: Record<BrandLockupSize, number> = {
  sm: 8,
  md: 10,
  lg: 20,
};

export function BrandLockup({
  size = "md",
  orientation = "horizontal",
  wordmarkColor,
  monogramBackgroundColor,
  monogramColor,
  label = "Bainder",
  className,
  style,
  ...rest
}: BrandLockupProps) {
  const stacked = orientation === "stacked";

  return (
    <div
      role="img"
      aria-label={label}
      className={cx("bd-brand-lockup", className)}
      style={{
        display: "inline-flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: "center",
        gap: gapBySize[size],
        ...style,
      }}
      {...rest}
    >
      <Monogram
        aria-hidden="true"
        size={size as MonogramSize}
        backgroundColor={monogramBackgroundColor}
        color={monogramColor}
      />
      <Wordmark aria-hidden="true" size={size as WordmarkSize} color={wordmarkColor} />
    </div>
  );
}
