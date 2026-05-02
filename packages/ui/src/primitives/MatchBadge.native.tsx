import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";

export type MatchBadgeProps = {
  value: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function MatchBadge({ value, label = "Your read match", style }: MatchBadgeProps) {
  const palette = useThemeColors();

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.num, { color: palette.fg }]}>{value}</Text>
      <Text style={[styles.pct, { color: palette.fg }]}>%</Text>
      <Text style={[styles.label, { color: palette.fgMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  num: {
    fontFamily: font.nativeFamily.display,
    fontWeight: "500",
    fontSize: 56,
    letterSpacing: -1.12,
    lineHeight: 56,
  },
  pct: {
    fontFamily: font.nativeFamily.display,
    fontWeight: "500",
    fontSize: 28,
  },
  label: {
    fontFamily: font.nativeFamily.ui,
    fontWeight: "500",
    fontSize: 13,
    marginLeft: 8,
  },
});
