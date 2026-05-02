import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeColors, type ThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";
import { radius } from "../tokens/radius.ts";
import { tintIcon } from "../utils/tintIcon.ts";

export type ButtonVariant = "primary" | "wine" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "pill" | "rounded";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sizeMap = {
  sm: { height: 36, padX: 16, fontSize: 13 },
  md: { height: 44, padX: 20, fontSize: 15 },
  lg: { height: 56, padX: 28, fontSize: 16 },
} as const;

type ButtonVariantStyle = {
  bg: string;
  fg: string;
  pressedBg: string;
  border?: string;
};

function buttonVariantStyle(variant: ButtonVariant, palette: ThemeColors): ButtonVariantStyle {
  switch (variant) {
    case "wine":
      return { bg: palette.accent, fg: palette.accentFg, pressedBg: palette.accentHover };
    case "secondary":
      return {
        bg: palette.surface,
        fg: palette.fg,
        pressedBg: palette.surfaceHover,
        border: palette.borderStrong,
      };
    case "ghost":
      return { bg: "transparent", fg: palette.fgSubtle, pressedBg: palette.surfaceHover };
    case "primary":
    default:
      return { bg: palette.action, fg: palette.actionFg, pressedBg: palette.actionHover };
  }
}

export function Button({
  variant = "primary",
  size = "md",
  shape = "pill",
  iconStart,
  iconEnd,
  children,
  disabled,
  fullWidth,
  style,
  ...rest
}: ButtonProps) {
  const palette = useThemeColors();
  const sizeCfg = sizeMap[size];
  const v = buttonVariantStyle(variant, palette);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizeCfg.height,
          paddingHorizontal: sizeCfg.padX,
          backgroundColor: pressed && !disabled ? v.pressedBg : v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? 1 : 0,
          borderRadius: shape === "pill" ? radius.pill : radius.md,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {tintIcon(iconStart, v.fg)}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: v.fg, fontSize: sizeCfg.fontSize }]}>{children}</Text>
      ) : (
        children
      )}
      {tintIcon(iconEnd, v.fg)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontFamily: font.nativeFamily.ui,
    fontWeight: "500",
  },
});
