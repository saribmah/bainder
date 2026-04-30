import type { HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type HairlineProps = HTMLAttributes<HTMLHRElement>;

export function Hairline({ className, ...rest }: HairlineProps) {
  return <hr className={cx("bd-hr", className)} {...rest} />;
}
