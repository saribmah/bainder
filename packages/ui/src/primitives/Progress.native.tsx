import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { radius } from "../tokens/radius.ts";

export type ProgressTone = "ink" | "wine";
export type ProgressSize = "default" | "thin";

export type ProgressProps = {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  style?: StyleProp<ViewStyle>;
};

export function Progress({
  value,
  max = 100,
  tone = "ink",
  size = "default",
  style,
}: ProgressProps) {
  const palette = useThemeColors();
  const clamped = Math.min(Math.max(value, 0), max);
  const pct = (clamped / max) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: clamped }}
      style={[
        styles.track,
        { backgroundColor: palette.border },
        size === "thin" && { height: 4 },
        style,
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            width: `${pct}%`,
            backgroundColor: tone === "wine" ? palette.accent : palette.action,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: radius.pill,
  },
});
