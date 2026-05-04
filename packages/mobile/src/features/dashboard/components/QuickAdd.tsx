import { Pressable, Text } from "react-native";
import { Chip, Icons, useThemeColors, useThemedStyles } from "@baindar/ui";
import { buildDashboardStyles } from "../dashboard.styles";

export function QuickAdd({ uploading, onPress }: { uploading: boolean; onPress: () => void }) {
  const styles = useThemedStyles(buildDashboardStyles);
  const palette = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={uploading}
      style={({ pressed }) => [styles.quickAdd, pressed ? styles.pressed : null]}
    >
      <Icons.Plus size={16} color={palette.fgSubtle} />
      <Text style={styles.quickAddText} numberOfLines={1}>
        Add an EPUB or import something new
      </Text>
      <Chip variant="outline">{uploading ? "Uploading" : "Browse"}</Chip>
    </Pressable>
  );
}
