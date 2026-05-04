import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";

export type MonogramSize = "sm" | "md" | "lg";

export type MonogramProps = Omit<ViewProps, "children" | "style"> & {
  size?: MonogramSize;
  backgroundColor?: string;
  color?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const sizeStyle: Record<MonogramSize, { box: number; radius: number; fontSize: number }> = {
  sm: { box: 32, radius: 8, fontSize: 20 },
  md: { box: 44, radius: 12, fontSize: 28 },
  lg: { box: 96, radius: 24, fontSize: 56 },
};

export function Monogram({
  size = "md",
  backgroundColor,
  color,
  label = "Baindar",
  style,
  textStyle,
  ...rest
}: MonogramProps) {
  const palette = useThemeColors();
  const sizing = sizeStyle[size];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        {
          width: sizing.box,
          height: sizing.box,
          borderRadius: sizing.radius,
          backgroundColor: backgroundColor ?? palette.action,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          {
            fontFamily: font.nativeFamily.display,
            fontSize: sizing.fontSize,
            fontWeight: "400",
            lineHeight: sizing.fontSize,
            color: color ?? palette.actionFg,
          },
          textStyle,
        ]}
      >
        b
      </Text>
    </View>
  );
}
