import { View } from "react-native";
import { Skeleton } from "@bainder/ui";
import { dashboardStyles as styles } from "../dashboard.styles";

export function DashboardLoading() {
  return (
    <View style={styles.loading}>
      <Skeleton width="100%" height={52} />
      <Skeleton width="100%" height={102} />
      <Skeleton width="100%" height={102} />
      <Skeleton width="72%" height={118} />
    </View>
  );
}
