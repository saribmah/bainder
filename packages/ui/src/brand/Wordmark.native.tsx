import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";

export type WordmarkSize = "sm" | "md" | "lg";

export type WordmarkProps = Omit<TextProps, "children" | "style"> & {
  size?: WordmarkSize;
  color?: string;
  style?: StyleProp<TextStyle>;
};

const sizeStyle: Record<WordmarkSize, { fontSize: number; letterSpacing: number }> = {
  sm: { fontSize: 18, letterSpacing: -0.63 },
  md: { fontSize: 22, letterSpacing: -0.88 },
  lg: { fontSize: 56, letterSpacing: -2.24 },
};

export function Wordmark({ size = "md", color, style, ...rest }: WordmarkProps) {
  const palette = useThemeColors();
  const sizing = sizeStyle[size];

  return (
    <Text
      style={[
        {
          fontFamily: font.nativeFamily.display,
          fontSize: sizing.fontSize,
          fontWeight: "400",
          lineHeight: sizing.fontSize,
          letterSpacing: sizing.letterSpacing,
          color: color ?? palette.fg,
        },
        style,
      ]}
      {...rest}
    >
      baindar
    </Text>
  );
}
