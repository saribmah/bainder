import { View, type StyleProp, type ViewStyle } from "react-native";
import { color } from "../tokens/color.ts";

export type HairlineProps = {
  style?: StyleProp<ViewStyle>;
};

export function Hairline({ style }: HairlineProps) {
  return (
    <View
      accessibilityRole="none"
      style={[{ height: 1, width: "100%", backgroundColor: color.paper[200] }, style]}
    />
  );
}
