import { Text, View } from "react-native";
import { useThemedStyles } from "@baindar/ui";
import { buildAuthStyles } from "../auth.styles";

export function OrDivider() {
  const styles = useThemedStyles(buildAuthStyles);
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerLabel}>OR</Text>
      <View style={styles.line} />
    </View>
  );
}
