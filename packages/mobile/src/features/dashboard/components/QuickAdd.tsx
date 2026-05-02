import { Pressable, Text } from "react-native";
import { Chip, Icons, color } from "@bainder/ui";
import { dashboardStyles as styles } from "../dashboard.styles";

export function QuickAdd({ uploading, onPress }: { uploading: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={uploading}
      style={({ pressed }) => [styles.quickAdd, pressed ? styles.pressed : null]}
    >
      <Icons.Plus size={16} color={color.paper[700]} />
      <Text style={styles.quickAddText} numberOfLines={1}>
        Add an EPUB or import something new
      </Text>
      <Chip variant="outline">{uploading ? "Uploading" : "Browse"}</Chip>
    </Pressable>
  );
}
