import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "../theme/ThemeProvider.native.tsx";
import { radius } from "../tokens/radius.ts";

export type FloatingToolbarProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FloatingToolbar({ children, style }: FloatingToolbarProps) {
  const palette = useThemeColors();
  return (
    <View
      accessibilityRole="toolbar"
      style={[
        styles.toolbar,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
    >
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
  const palette = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pressed && !disabled ? palette.surfaceHover : "transparent" },
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
    borderWidth: 1,
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
