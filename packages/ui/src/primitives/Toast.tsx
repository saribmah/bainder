import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type ToastProps = HTMLAttributes<HTMLDivElement> & {
  iconStart?: ReactNode;
};

export function Toast({ iconStart, className, children, ...rest }: ToastProps) {
  return (
    <div role="status" className={cx("bd-toast", className)} {...rest}>
      {iconStart}
      <span>{children}</span>
    </div>
  );
}
