import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icons, Input, Wordmark, useThemeColors, useThemedStyles } from "@baindar/ui";
import { buildDashboardStyles } from "../dashboard.styles";
import { formatDayLabel } from "../utils/date";

export function DashboardHeader({
  reader,
  searchOpen,
  query,
  onQuery,
  onToggleSearch,
}: {
  reader: string;
  searchOpen: boolean;
  query: string;
  onQuery: (value: string) => void;
  onToggleSearch: () => void;
}) {
  const router = useRouter();
  const styles = useThemedStyles(buildDashboardStyles);
  const palette = useThemeColors();
  return (
    <View>
      <View style={styles.nav}>
        <Wordmark size="sm" />
        <View style={styles.navActions}>
          <Pressable accessibilityRole="button" onPress={onToggleSearch} style={styles.iconButton}>
            <Icons.Search size={16} color={palette.fg} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("/settings")}
            style={styles.iconButton}
          >
            <Icons.User size={16} color={palette.fg} />
          </Pressable>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search across everything..."
            value={query}
            onChangeText={onQuery}
            iconStart={<Icons.Search size={16} color={palette.fgMuted} />}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>{formatDayLabel()}</Text>
        <Text style={styles.title}>
          Good evening,{"\n"}
          {reader}.
        </Text>
      </View>
    </View>
  );
}
