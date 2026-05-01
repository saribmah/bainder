import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type ToastProps = {
  iconStart?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Toast({ iconStart, children, style }: ToastProps) {
  return (
    <View accessibilityRole="alert" style={[styles.toast, style]}>
      {iconStart}
      {typeof children === "string" ? <Text style={styles.label}>{children}</Text> : children}
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
    backgroundColor: color.paper[900],
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    alignSelf: "flex-start",
  },
  label: {
    color: color.paper[50],
    fontSize: 15,
    fontWeight: "500",
  },
});
