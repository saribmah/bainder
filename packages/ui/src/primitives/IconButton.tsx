import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: IconButtonSize;
  "aria-label": string;
  children: ReactNode;
};

const sizeClass: Record<IconButtonSize, string> = {
  sm: "bd-btn-icon-sm",
  md: "",
  lg: "bd-btn-icon-lg",
};

export function IconButton({
  size = "md",
  className,
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx("bd-btn", "bd-btn-icon", sizeClass[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
