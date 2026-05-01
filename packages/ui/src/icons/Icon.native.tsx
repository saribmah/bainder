import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg from "react-native-svg";
import { color as tokenColor } from "../tokens/color.ts";

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  title?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
};

type IconRootProps = IconProps & { children: ReactNode };

export function Icon({
  size = 22,
  color = tokenColor.paper[900],
  strokeWidth = 1.5,
  style,
  "aria-label": ariaLabel,
  children,
}: IconRootProps) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      color={color}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      accessibilityLabel={ariaLabel}
    >
      {children}
    </Svg>
  );
}
