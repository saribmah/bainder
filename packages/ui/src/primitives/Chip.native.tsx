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
import { useThemeColors, type ThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";
import { radius } from "../tokens/radius.ts";
import { tintIcon } from "../utils/tintIcon.ts";

export type ChipVariant = "filled" | "outline" | "active";

function chipVariantStyle(
  variant: ChipVariant,
  palette: ThemeColors,
): { bg: string; fg: string; border?: string } {
  switch (variant) {
    case "outline":
      return { bg: "transparent", fg: palette.fgSubtle, border: palette.borderStrong };
    case "active":
      return { bg: palette.action, fg: palette.actionFg, border: palette.action };
    case "filled":
    default:
      return { bg: palette.surfaceRaised, fg: palette.fgSubtle };
  }
}

type ChipBaseProps = {
  variant?: ChipVariant;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export type ChipProps = ChipBaseProps;

export function Chip({ variant = "filled", iconStart, iconEnd, children, style }: ChipProps) {
  const palette = useThemeColors();
  const v = chipVariantStyle(variant, palette);
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
      {tintIcon(iconStart, v.fg)}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: v.fg }]}>{children}</Text>
      ) : (
        children
      )}
      {tintIcon(iconEnd, v.fg)}
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
  const palette = useThemeColors();
  const v = chipVariantStyle(variant, palette);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed && !disabled ? palette.surfaceHover : v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {tintIcon(iconStart, v.fg)}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: v.fg }]}>{children}</Text>
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
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  label: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    fontWeight: "500",
  },
});
