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
import { useThemeColors } from "../theme/index.native.ts";
import { radius } from "../tokens/radius.ts";

export type CardVariant = "default" | "elevated";

export type CardProps = Omit<ViewProps, "style"> & {
  variant?: CardVariant;
  onPress?: PressableProps["onPress"];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Card({ variant = "default", onPress, style, children, ...rest }: CardProps) {
  const palette = useThemeColors();
  const variantStyle = variant === "elevated" ? styles.elevated : styles.default;
  const themedStyle = {
    backgroundColor: palette.surface,
    borderColor: variant === "elevated" ? "transparent" : palette.border,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          variantStyle,
          themedStyle,
          { backgroundColor: pressed ? palette.surfaceHover : palette.surface },
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[variantStyle, themedStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  elevated: {
    borderRadius: radius.xl,
    borderWidth: 0,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
