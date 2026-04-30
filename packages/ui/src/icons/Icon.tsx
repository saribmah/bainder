import type { CSSProperties, ReactNode, SVGAttributes } from "react";

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
  "aria-label"?: string;
  "aria-hidden"?: SVGAttributes<SVGSVGElement>["aria-hidden"];
};

type IconRootProps = IconProps & { children: ReactNode };

export function Icon({
  size = 22,
  color = "currentColor",
  strokeWidth = 1.5,
  className,
  style,
  title,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
  children,
}: IconRootProps) {
  const decorative = ariaHidden ?? !ariaLabel;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={decorative ? true : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}
