import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type ButtonVariant = "primary" | "wine" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "pill" | "rounded";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bd-btn-primary",
  wine: "bd-btn-wine",
  secondary: "bd-btn-secondary",
  ghost: "bd-btn-ghost",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "bd-btn-sm",
  md: "bd-btn-md",
  lg: "bd-btn-lg",
};

const shapeClass: Record<ButtonShape, string> = {
  pill: "bd-btn-pill",
  rounded: "bd-btn-rounded",
};

export function Button({
  variant = "primary",
  size = "md",
  shape = "pill",
  iconStart,
  iconEnd,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("bd-btn", variantClass[variant], sizeClass[size], shapeClass[shape], className)}
      {...rest}
    >
      {iconStart}
      {children}
      {iconEnd}
    </button>
  );
}
