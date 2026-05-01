import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type CardVariant = "default" | "elevated";

export type CardProps = Omit<ViewProps, "style"> & {
  variant?: CardVariant;
  onPress?: PressableProps["onPress"];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Card({ variant = "default", onPress, style, children, ...rest }: CardProps) {
  const baseStyle: StyleProp<ViewStyle> =
    variant === "elevated" ? [styles.elevated, style] : [styles.default, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          baseStyle,
          { backgroundColor: pressed ? color.paper[100] : color.paper[50] },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={baseStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    backgroundColor: color.paper[50],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.paper[200],
  },
  elevated: {
    backgroundColor: color.paper[50],
    borderRadius: radius.xl,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
