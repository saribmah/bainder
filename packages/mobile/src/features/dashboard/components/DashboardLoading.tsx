import { View } from "react-native";
import { Skeleton, useThemedStyles } from "@bainder/ui";
import { buildDashboardStyles } from "../dashboard.styles";

export function DashboardLoading() {
  const styles = useThemedStyles(buildDashboardStyles);
  return (
    <View style={styles.loading}>
      <Skeleton width="100%" height={52} />
      <Skeleton width="100%" height={102} />
      <Skeleton width="100%" height={102} />
      <Skeleton width="72%" height={118} />
    </View>
  );
}
