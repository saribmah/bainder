import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, IconButton, Icons, color } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { KIND_LABEL } from "../constants";
import { dashboardStyles as styles } from "../dashboard.styles";
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
          <Icons.MoreVertical size={16} color={color.paper[700]} />
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
          <Icons.MoreVertical size={14} color={color.paper[600]} />
        </IconButton>
      </View>
    </View>
  );
}

export function CollectionRail({
  recentCount,
  pendingCount,
}: {
  recentCount: number;
  pendingCount: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.collections}
    >
      <CollectionCard name="Processed" count={recentCount} dot={color.highlight.green} />
      <CollectionCard name="In progress" count={pendingCount} dot={color.highlight.yellow} />
      <CollectionCard name="Book notes" count={0} dot={color.highlight.pink} />
    </ScrollView>
  );
}

function CollectionCard({ name, count, dot }: { name: string; count: number; dot: string }) {
  return (
    <View style={styles.collectionCard}>
      <View style={[styles.collectionDot, { backgroundColor: dot }]} />
      <Text style={styles.collectionName}>{name}</Text>
      <Text style={styles.collectionCount}>{count} items</Text>
    </View>
  );
}
