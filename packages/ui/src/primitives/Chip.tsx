import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type ChipVariant = "filled" | "outline" | "active";

const variantClass: Record<ChipVariant, string> = {
  filled: "",
  outline: "bd-chip-outline",
  active: "bd-chip-active",
};

type ChipBaseProps = {
  variant?: ChipVariant;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
};

export type ChipProps = ChipBaseProps & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export function Chip({
  variant = "filled",
  iconStart,
  iconEnd,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span className={cx("bd-chip", variantClass[variant], className)} {...rest}>
      {iconStart}
      {children}
      {iconEnd}
    </span>
  );
}

export type ChipButtonProps = ChipBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function ChipButton({
  variant = "filled",
  iconStart,
  iconEnd,
  className,
  children,
  type = "button",
  ...rest
}: ChipButtonProps) {
  return (
    <button type={type} className={cx("bd-chip", variantClass[variant], className)} {...rest}>
      {iconStart}
      {children}
      {iconEnd}
    </button>
  );
}
