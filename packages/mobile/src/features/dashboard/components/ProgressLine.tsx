import { View } from "react-native";
import { color } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { dashboardStyles as styles } from "../dashboard.styles";

export function ProgressLine({ doc }: { doc: Document }) {
  // `progressPercent` is in [0, 1]; clamp the visual range so a 0% bar is
  // still visible and 100% doesn't visually overshoot.
  const pct = doc.progress?.progressPercent;
  const reading = pct !== null && pct !== undefined ? Math.min(98, Math.max(6, pct * 100)) : 12;
  const status = doc.status === "processed" ? reading : doc.status === "failed" ? 100 : 42;

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${status}%`,
            backgroundColor: doc.status === "failed" ? color.status.error : color.paper[900],
          },
        ]}
      />
    </View>
  );
}
