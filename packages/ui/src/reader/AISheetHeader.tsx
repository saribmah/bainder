import type { HTMLAttributes, ReactNode } from "react";
import { Icons } from "../icons/index.ts";
import { cx } from "../utils/cx.ts";

export type AISheetHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  label?: ReactNode;
  iconSize?: number;
};

export function AISheetHeader({
  label = "Ask Bainder",
  iconSize = 14,
  className,
  ...rest
}: AISheetHeaderProps) {
  return (
    <div className={cx("bd-ai-header", className)} {...rest}>
      <Icons.Sparkles size={iconSize} />
      <span className="bd-ai-header-label">{label}</span>
    </div>
  );
}
