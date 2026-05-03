import { Text, View } from "react-native";
import { Card } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { dashboardStyles as styles } from "../dashboard.styles";
import { DocumentRow, RecentCard } from "./DocumentCards";
import { QuickAdd } from "./QuickAdd";
import { SectionHeader } from "./SectionHeader";

export function DashboardContent({
  inProgress,
  recent,
  pending,
  uploading,
  onUpload,
  onOpen,
  onMore,
}: {
  inProgress: Document[];
  recent: Document[];
  pending: Document[];
  uploading: boolean;
  onUpload: () => void;
  onOpen: (doc: Document) => void;
  onMore: (doc: Document) => void;
}) {
  return (
    <View>
      <QuickAdd uploading={uploading} onPress={onUpload} />

      {pending.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Processing" meta={`${pending.length} queued`} />
          <View style={styles.stack}>
            {pending.slice(0, 2).map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Pick up where you left off" meta="See all" />
        <View style={styles.stack}>
          {inProgress.length > 0 ? (
            inProgress.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onPress={() => onOpen(doc)}
                onMore={() => onMore(doc)}
              />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                Open a document and Bainder will keep your place here.
              </Text>
            </Card>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recently added" meta={`${recent.length} items`} />
        <View style={styles.recentGrid}>
          {recent.map((doc) => (
            <RecentCard
              key={doc.id}
              doc={doc}
              onPress={() => onOpen(doc)}
              onMore={() => onMore(doc)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
