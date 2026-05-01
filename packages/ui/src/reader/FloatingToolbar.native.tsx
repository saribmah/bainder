import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type FloatingToolbarProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FloatingToolbar({ children, style }: FloatingToolbarProps) {
  return (
    <View accessibilityRole="toolbar" style={[styles.toolbar, style]}>
      {children}
    </View>
  );
}

export type FloatingToolbarButtonProps = Omit<PressableProps, "children" | "style"> & {
  "aria-label": string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FloatingToolbarButton({
  "aria-label": ariaLabel,
  children,
  style,
  disabled,
  ...rest
}: FloatingToolbarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pressed && !disabled ? color.paper[100] : "transparent" },
        disabled ? { opacity: 0.5 } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    backgroundColor: color.paper[50],
    borderWidth: 1,
    borderColor: color.paper[200],
    borderRadius: radius.pill,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
