import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type MonogramSize = "sm" | "md" | "lg";

export type MonogramProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  size?: MonogramSize;
  backgroundColor?: string;
  color?: string;
  label?: string;
};

const sizeStyle: Record<MonogramSize, { box: number; radius: number; fontSize: number }> = {
  sm: { box: 32, radius: 8, fontSize: 20 },
  md: { box: 44, radius: 12, fontSize: 28 },
  lg: { box: 96, radius: 24, fontSize: 56 },
};

export function Monogram({
  size = "md",
  backgroundColor = "var(--bd-action)",
  color = "var(--bd-action-fg)",
  label = "Baindar",
  className,
  style,
  ...rest
}: MonogramProps) {
  const sizing = sizeStyle[size];

  return (
    <div
      role="img"
      aria-label={label}
      className={cx("bd-monogram", className)}
      style={{
        width: sizing.box,
        height: sizing.box,
        borderRadius: sizing.radius,
        background: backgroundColor,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: sizing.fontSize,
          fontWeight: 400,
          lineHeight: 1,
          fontVariationSettings: '"opsz" 144, "SOFT" 100',
          color: "currentColor",
        }}
      >
        b
      </span>
    </div>
  );
}
