import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type FloatingToolbarProps = HTMLAttributes<HTMLDivElement>;

export function FloatingToolbar({ className, children, ...rest }: FloatingToolbarProps) {
  return (
    <div role="toolbar" className={cx("bd-floating-toolbar", className)} {...rest}>
      {children}
    </div>
  );
}

export type FloatingToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  children: ReactNode;
};

export function FloatingToolbarButton({
  className,
  type = "button",
  children,
  ...rest
}: FloatingToolbarButtonProps) {
  return (
    <button type={type} className={cx("bd-floating-toolbar-btn", className)} {...rest}>
      {children}
    </button>
  );
}
