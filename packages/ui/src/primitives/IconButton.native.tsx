import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

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
          backgroundColor: pressed && !disabled ? color.paper[100] : color.paper[50],
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.paper[200],
  },
});
