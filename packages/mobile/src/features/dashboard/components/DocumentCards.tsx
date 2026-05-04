import { Pressable, Text, View } from "react-native";
import { Card, IconButton, Icons, useThemeColors, useThemedStyles } from "@baindar/ui";
import type { Document } from "@baindar/sdk";
import { KIND_LABEL } from "../constants";
import { buildDashboardStyles } from "../dashboard.styles";
import { formatRelativeTime } from "../utils/date";
import { getProgressLabel } from "../utils/document";
import { DocumentCover } from "./DocumentCover";
import { ProgressLine } from "./ProgressLine";

export function DocumentRow({
  doc,
  onPress,
  onMore,
}: {
  doc: Document;
  onPress?: () => void;
  onMore?: () => void;
}) {
  const styles = useThemedStyles(buildDashboardStyles);
  const palette = useThemeColors();
  const subtitle = getProgressLabel(doc) ?? doc.originalFilename;

  return (
    <Card style={styles.documentRow} onPress={doc.status === "processed" ? onPress : undefined}>
      <DocumentCover doc={doc} width={46} height={62} />
      <View style={styles.documentBody}>
        <Text style={styles.kindLabel}>{KIND_LABEL[doc.kind]}</Text>
        <Text style={styles.documentTitle} numberOfLines={1}>
          {doc.title}
        </Text>
        <Text style={styles.documentSub} numberOfLines={1}>
          {doc.status === "failed" ? (doc.errorReason ?? "Failed") : subtitle}
        </Text>
        <ProgressLine doc={doc} />
      </View>
      {doc.status === "processed" && onMore ? (
        <IconButton aria-label="More actions" size="sm" onPress={onMore}>
          <Icons.MoreVertical size={16} color={palette.fgSubtle} />
        </IconButton>
      ) : null}
    </Card>
  );
}

export function RecentCard({
  doc,
  onPress,
  onMore,
}: {
  doc: Document;
  onPress: () => void;
  onMore: () => void;
}) {
  const styles = useThemedStyles(buildDashboardStyles);
  const palette = useThemeColors();
  return (
    <View style={styles.recentCard}>
      <Pressable accessibilityRole="button" onPress={onPress}>
        <DocumentCover doc={doc} width={94} height={142} />
      </Pressable>
      <View style={styles.recentTextRow}>
        <View style={styles.recentText}>
          <Text style={styles.recentTitle} numberOfLines={2}>
            {doc.title}
          </Text>
          <Text style={styles.recentSub} numberOfLines={1}>
            {formatRelativeTime(doc.createdAt)}
          </Text>
        </View>
        <IconButton aria-label="More actions" size="sm" onPress={onMore}>
          <Icons.MoreVertical size={14} color={palette.fgSubtle} />
        </IconButton>
      </View>
    </View>
  );
}
