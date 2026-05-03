import { Text, View } from "react-native";
import { useThemedStyles } from "@bainder/ui";
import { buildDashboardStyles } from "../dashboard.styles";

export function SectionHeader({ title, meta }: { title: string; meta: string }) {
  const styles = useThemedStyles(buildDashboardStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}
