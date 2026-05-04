import { Pressable } from "react-native";
import { Icons, useThemeColors, useThemedStyles } from "@baindar/ui";
import { buildAuthStyles } from "../auth.styles";

export function BackButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(buildAuthStyles);
  const palette = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={styles.back}
    >
      <Icons.Back size={18} color={palette.fg} />
    </Pressable>
  );
}
