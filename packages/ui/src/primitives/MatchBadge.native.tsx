import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { color } from "../tokens/color.ts";

export type MatchBadgeProps = {
  value: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function MatchBadge({ value, label = "Your read match", style }: MatchBadgeProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.num}>{value}</Text>
      <Text style={styles.pct}>%</Text>
      <Text style={styles.label}>{label}</Text>
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
    fontWeight: "500",
    fontSize: 56,
    letterSpacing: -1.12,
    color: color.paper[900],
    lineHeight: 56,
  },
  pct: {
    fontWeight: "500",
    fontSize: 28,
    color: color.paper[900],
  },
  label: {
    fontWeight: "500",
    fontSize: 13,
    color: color.paper[500],
    marginLeft: 8,
  },
});
