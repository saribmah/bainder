import { Pressable, Text, View } from "react-native";
import { Card, Icons, color } from "@bainder/ui";
import { dashboardStyles as styles } from "../dashboard.styles";

export function DropDashboard({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: () => void;
}) {
  return (
    <View style={styles.dropWrap}>
      <View style={styles.dropZone}>
        <View style={[styles.faintCover, styles.faintCoverLeft]}>
          <Text style={styles.faintCoverText}>The Book of Art</Text>
        </View>
        <View
          style={[
            styles.faintCover,
            styles.faintCoverRight,
            { backgroundColor: color.highlight.pink },
          ]}
        >
          <Text style={styles.faintCoverText}>Ladybird</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onUpload}
          disabled={uploading}
          style={styles.dropIcon}
        >
          <Icons.Plus size={20} color={color.paper[800]} />
        </Pressable>
        <Text style={styles.dropTitle}>Add anything to read</Text>
        <Text style={styles.dropLead}>EPUB files today. PDF, articles, and links are next.</Text>

        <Pressable accessibilityRole="button" onPress={onUpload} style={styles.linkImport}>
          <Text style={styles.linkPlaceholder}>Paste a link soon...</Text>
          <View style={styles.linkButton}>
            <Text style={styles.linkButtonText}>{uploading ? "..." : "Go"}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.dropHints}>
        <ImportHint icon={Icons.BookOpen} label="From your device" />
        <ImportHint icon={Icons.Sparkles} label="Grounded answers" />
        <ImportHint icon={Icons.Note} label="Connected notes" />
      </View>
    </View>
  );
}

export function FilteredEmpty({ query }: { query: string }) {
  return (
    <Card style={styles.filteredEmpty}>
      <Icons.Search size={24} color={color.paper[500]} />
      <Text style={styles.filteredTitle}>No matches</Text>
      <Text style={styles.filteredBody}>{`Nothing matches "${query}".`}</Text>
    </Card>
  );
}

function ImportHint({ icon: Icon, label }: { icon: typeof Icons.BookOpen; label: string }) {
  return (
    <View style={styles.importHint}>
      <Icon size={14} color={color.paper[600]} />
      <Text style={styles.importHintText}>{label}</Text>
    </View>
  );
}
