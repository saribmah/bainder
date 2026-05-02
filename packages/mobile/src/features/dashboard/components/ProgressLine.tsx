import { View } from "react-native";
import { color } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { dashboardStyles as styles } from "../dashboard.styles";

export function ProgressLine({ doc }: { doc: Document }) {
  const progress = doc.progress ? Math.min(92, 18 + doc.progress.epubChapterOrder * 7) : 12;
  const status = doc.status === "processed" ? progress : doc.status === "failed" ? 100 : 42;

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
