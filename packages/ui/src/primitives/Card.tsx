import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type CardVariant = "default" | "elevated";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export function Card({ variant = "default", className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(variant === "elevated" ? "bd-card-elevated" : "bd-card", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
