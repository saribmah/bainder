import { Pressable, Text } from "react-native";
import { useThemedStyles } from "@baindar/ui";
import { buildAuthStyles } from "../auth.styles";

export function SocialButton({
  provider,
  onPress,
}: {
  provider: "google" | "apple";
  onPress: () => void;
}) {
  const styles = useThemedStyles(buildAuthStyles);
  const isApple = provider === "apple";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        isApple ? styles.socialButtonApple : styles.socialButtonGoogle,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.socialMark, isApple ? styles.socialMarkApple : styles.socialMarkGoogle]}>
        {isApple ? "A" : "G"}
      </Text>
      <Text style={[styles.socialLabel, isApple ? styles.socialLabelApple : null]}>
        Continue with {isApple ? "Apple" : "Google"}
      </Text>
    </Pressable>
  );
}
