import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg from "react-native-svg";
import { useThemeColors } from "../theme/ThemeProvider.native.tsx";

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
  color,
  strokeWidth = 1.5,
  style,
  "aria-label": ariaLabel,
  children,
}: IconRootProps) {
  const palette = useThemeColors();

  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      color={color ?? palette.fg}
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
