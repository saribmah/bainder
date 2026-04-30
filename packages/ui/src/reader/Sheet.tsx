import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type SheetProps = HTMLAttributes<HTMLDivElement> & {
  showHandle?: boolean;
};

export function Sheet({ showHandle = true, className, children, ...rest }: SheetProps) {
  return (
    <div className={cx("bd-sheet", className)} {...rest}>
      {showHandle && <SheetHandle />}
      {children}
    </div>
  );
}

export type SheetHandleProps = HTMLAttributes<HTMLDivElement>;

export function SheetHandle({ className, ...rest }: SheetHandleProps) {
  return <div aria-hidden className={cx("bd-sheet-handle", className)} {...rest} />;
}
