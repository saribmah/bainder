import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

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

const variantMap: Record<
  ButtonVariant,
  { bg: string; fg: string; pressedBg: string; border?: string }
> = {
  primary: { bg: color.paper[900], fg: color.paper[50], pressedBg: color.paper[800] },
  wine: { bg: color.wine[700], fg: color.paper[50], pressedBg: color.wine[600] },
  secondary: {
    bg: color.paper[50],
    fg: color.paper[900],
    pressedBg: color.paper[100],
    border: color.paper[300],
  },
  ghost: { bg: "transparent", fg: color.paper[800], pressedBg: color.paper[100] },
};

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
  const sizeCfg = sizeMap[size];
  const v = variantMap[variant];

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
      {iconStart}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: v.fg, fontSize: sizeCfg.fontSize }]}>{children}</Text>
      ) : (
        children
      )}
      {iconEnd}
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
    fontWeight: "500",
  },
});
