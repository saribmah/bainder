import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type ProgressTone = "ink" | "wine";
export type ProgressSize = "default" | "thin";

export type ProgressProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: ProgressSize;
};

export function Progress({
  value,
  max = 100,
  tone = "ink",
  size = "default",
  className,
  ...rest
}: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const pct = (clamped / max) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className={cx("bd-progress", size === "thin" && "bd-progress-thin", className)}
      {...rest}
    >
      <div
        className={cx("bd-progress-bar", tone === "wine" && "bd-progress-bar-wine")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
