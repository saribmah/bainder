import { View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "../theme/index.native.ts";

export type HairlineProps = {
  style?: StyleProp<ViewStyle>;
};

export function Hairline({ style }: HairlineProps) {
  const palette = useThemeColors();

  return (
    <View
      accessibilityRole="none"
      style={[styles.base, { backgroundColor: palette.border }, style]}
    />
  );
}

const styles = {
  base: {
    height: 1,
    width: "100%",
  },
} as const;
