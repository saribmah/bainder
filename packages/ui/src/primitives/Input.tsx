import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx.ts";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  wrapClassName?: string;
};

export function Input({ iconStart, iconEnd, className, wrapClassName, ...rest }: InputProps) {
  if (!iconStart && !iconEnd) {
    return <input className={cx("bd-input", className)} {...rest} />;
  }
  return (
    <div
      className={cx(
        "bd-input-wrap",
        iconStart ? "bd-input-wrap-icon-start" : null,
        iconEnd ? "bd-input-wrap-icon-end" : null,
        wrapClassName,
      )}
    >
      {iconStart && <span className="bd-input-icon bd-input-icon-start">{iconStart}</span>}
      <input className={cx("bd-input", className)} {...rest} />
      {iconEnd && <span className="bd-input-icon bd-input-icon-end">{iconEnd}</span>}
    </div>
  );
}
