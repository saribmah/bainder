import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type SkeletonShape = "rect" | "pill" | "circle" | "text";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  shape?: SkeletonShape;
  width?: number | string;
  height?: number | string;
};

const shapeClass: Record<SkeletonShape, string> = {
  rect: "bd-skeleton-rect",
  pill: "bd-skeleton-pill",
  circle: "bd-skeleton-circle",
  text: "bd-skeleton-text",
};

export function Skeleton({
  shape = "rect",
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const merged: CSSProperties = {
    ...(width !== undefined ? { width } : null),
    ...(height !== undefined ? { height } : null),
    ...style,
  };
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cx("bd-skeleton", shapeClass[shape], className)}
      style={merged}
      {...rest}
    />
  );
}
