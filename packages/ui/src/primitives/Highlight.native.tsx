import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { color } from "../tokens/color.ts";

export type HighlightColor = "pink" | "yellow" | "green" | "blue" | "purple";

export type HighlightProps = {
  color?: HighlightColor;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  onPress?: () => void;
};

const tone: Record<HighlightColor, string> = {
  pink: color.highlight.pink,
  yellow: color.highlight.yellow,
  green: color.highlight.green,
  blue: color.highlight.blue,
  purple: color.highlight.purple,
};

export function Highlight({ color: tint = "pink", children, style, onPress }: HighlightProps) {
  return (
    <Text style={[styles.mark, { backgroundColor: tone[tint] }, style]} onPress={onPress}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    paddingVertical: 2,
  },
});
