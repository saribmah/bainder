import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type ChipVariant = "filled" | "outline" | "active";

const variantStyle: Record<ChipVariant, { bg: string; fg: string; border?: string }> = {
  filled: { bg: color.paper[100], fg: color.paper[700] },
  outline: { bg: "transparent", fg: color.paper[700], border: color.paper[300] },
  active: { bg: color.paper[900], fg: color.paper[50], border: color.paper[900] },
};

type ChipBaseProps = {
  variant?: ChipVariant;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export type ChipProps = ChipBaseProps;

export function Chip({ variant = "filled", iconStart, iconEnd, children, style }: ChipProps) {
  const v = variantStyle[variant];
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? 1 : 0,
        },
        style,
      ]}
    >
      {iconStart}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: v.fg }]}>{children}</Text>
      ) : (
        children
      )}
      {iconEnd}
    </View>
  );
}

export type ChipButtonProps = ChipBaseProps & Omit<PressableProps, "children" | "style">;

export function ChipButton({
  variant = "filled",
  iconStart,
  iconEnd,
  children,
  disabled,
  style,
  ...rest
}: ChipButtonProps) {
  const v = variantStyle[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed && !disabled ? color.paper[200] : v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {iconStart}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: v.fg }]}>{children}</Text>
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
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
});
