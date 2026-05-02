import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { radius } from "../tokens/radius.ts";
import { tintIcon } from "../utils/tintIcon.ts";

export type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = Omit<PressableProps, "children" | "style"> & {
  size?: IconButtonSize;
  "aria-label": string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const sizeMap: Record<IconButtonSize, number> = { sm: 36, md: 44, lg: 56 };

export function IconButton({
  size = "md",
  "aria-label": ariaLabel,
  children,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const palette = useThemeColors();
  const dim = sizeMap[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          backgroundColor: pressed && !disabled ? palette.surfaceHover : palette.surface,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {tintIcon(children, palette.fg)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
