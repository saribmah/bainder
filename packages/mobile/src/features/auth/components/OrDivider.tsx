import { Text, View } from "react-native";
import { authStyles as styles } from "../auth.styles";

export function OrDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerLabel}>OR</Text>
      <View style={styles.line} />
    </View>
  );
}
