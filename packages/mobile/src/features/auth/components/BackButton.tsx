import { Pressable } from "react-native";
import { Icons, color } from "@bainder/ui";
import { authStyles as styles } from "../auth.styles";

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={styles.back}
    >
      <Icons.Back size={18} color={color.paper[800]} />
    </Pressable>
  );
}
