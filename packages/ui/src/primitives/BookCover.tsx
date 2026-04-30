import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "../utils/cx.ts";

export type BookCoverProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  src?: string;
  background?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
};

export function BookCover({
  src,
  background,
  width,
  height,
  alt,
  className,
  style,
  ...rest
}: BookCoverProps) {
  const cover: CSSProperties = {
    width,
    height,
    backgroundImage: src ? `url(${src})` : undefined,
    background: !src && background ? background : undefined,
    ...style,
  };
  return (
    <div
      role={alt ? "img" : undefined}
      aria-label={alt}
      className={cx("bd-book-cover", className)}
      style={cover}
      {...rest}
    />
  );
}
