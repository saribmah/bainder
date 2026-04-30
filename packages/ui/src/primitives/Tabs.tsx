import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type TabsProps = HTMLAttributes<HTMLDivElement>;

export function Tabs({ className, children, ...rest }: TabsProps) {
  return (
    <div role="tablist" className={cx("bd-tabs", className)} {...rest}>
      {children}
    </div>
  );
}

export type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function Tab({ active, className, type = "button", children, ...rest }: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type={type}
      className={cx("bd-tab", active && "bd-tab-active", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
