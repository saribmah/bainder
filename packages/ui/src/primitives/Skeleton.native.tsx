import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type SkeletonShape = "rect" | "pill" | "circle" | "text";

export type SkeletonProps = {
  shape?: SkeletonShape;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
};

const shapeStyle: Record<SkeletonShape, ViewStyle> = {
  rect: { borderRadius: radius.md },
  pill: { borderRadius: radius.pill },
  circle: { borderRadius: 999 },
  text: { borderRadius: radius.sm, height: 12 },
};

export function Skeleton({ shape = "rect", width, height, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessible={false}
      style={[
        styles.base,
        shapeStyle[shape],
        width !== undefined ? { width } : null,
        height !== undefined ? { height } : null,
        { opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: color.paper[200],
  },
});
