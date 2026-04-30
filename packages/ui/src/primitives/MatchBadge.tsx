import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type MatchBadgeProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  value: number;
  label?: string;
};

export function MatchBadge({
  value,
  label = "Your read match",
  className,
  ...rest
}: MatchBadgeProps) {
  return (
    <div className={cx("bd-match", className)} {...rest}>
      <span className="bd-match-num">{value}</span>
      <span className="bd-match-pct">%</span>
      <span className="bd-match-label">{label}</span>
    </div>
  );
}
