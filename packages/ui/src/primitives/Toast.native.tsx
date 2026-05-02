import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";
import { radius } from "../tokens/radius.ts";
import { tintIcon } from "../utils/tintIcon.ts";

export type ToastProps = {
  iconStart?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Toast({ iconStart, children, style }: ToastProps) {
  const palette = useThemeColors();

  return (
    <View
      accessibilityRole="alert"
      style={[styles.toast, { backgroundColor: palette.action }, style]}
    >
      {tintIcon(iconStart, palette.actionFg)}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: palette.actionFg }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    fontWeight: "500",
  },
});
