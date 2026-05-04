import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Shelf } from "@baindar/sdk";
import { color, font } from "@baindar/ui";
import { shelfDescription, shelfItemNoun, shelfPaletteColors } from "../utils/shelf";

export function SpineFan({ shelf, size = 48 }: { shelf: Shelf; size?: number }) {
  const colors = shelfPaletteColors(shelf);
  const width = size;
  const height = size * 1.4;

  return (
    <View style={{ width: width * 1.5, height }}>
      {colors.map((background, index) => {
        const offset = (index - 1) * (width * 0.18);
        const rotation = (index - 1) * 6;
        return (
          <View
            key={`${background}-${index}`}
            style={[
              styles.spine,
              {
                left: width * 0.75 - width * 0.31 + offset,
                width: width * 0.62,
                height,
                backgroundColor: background,
                transform: [{ rotate: `${rotation}deg` }],
                zIndex: index === 1 ? 2 : 1,
              },
            ]}
          >
            <View style={styles.spineRule} />
            <View style={[styles.spineRule, { marginTop: 4 }]} />
          </View>
        );
      })}
    </View>
  );
}

export function ShelfCard({
  shelf,
  compact = false,
  active = false,
  onPress,
}: {
  shelf: Shelf;
  compact?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  const description = shelfDescription(shelf);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        compact ? styles.cardCompact : styles.cardRegular,
        active ? styles.cardActive : null,
      ]}
    >
      <View style={[styles.artRow, { height: compact ? 70 : 86 }]}>
        <SpineFan shelf={shelf} size={compact ? 38 : 48} />
        <Text style={styles.count}>{shelf.itemCount}</Text>
      </View>
      <View>
        <Text style={[styles.name, compact ? styles.nameCompact : null]} numberOfLines={2}>
          {shelf.name}
        </Text>
        {description && !compact && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
        {shelf.kind === "smart" && !compact && (
          <Text style={styles.description}>
            Smart shelf · {shelf.itemCount} {shelfItemNoun(shelf.itemCount)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spine: {
    position: "absolute",
    top: 0,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderBottomLeftRadius: 2,
    shadowColor: color.paper[900],
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  spineRule: {
    height: 6,
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  card: {
    gap: 10,
    borderWidth: 1,
    borderColor: color.paper[200],
    borderRadius: 14,
    backgroundColor: color.paper[50],
  },
  cardActive: {
    backgroundColor: color.paper[100],
  },
  cardRegular: {
    width: 220,
    padding: 16,
  },
  cardCompact: {
    width: 180,
    padding: 12,
  },
  artRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  count: {
    fontFamily: font.nativeFamily.mono,
    fontSize: 11,
    color: color.paper[500],
  },
  name: {
    fontFamily: font.nativeFamily.display,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 21,
    color: color.paper[900],
  },
  nameCompact: {
    fontSize: 15,
    lineHeight: 18,
  },
  description: {
    marginTop: 2,
    fontFamily: font.nativeFamily.ui,
    fontSize: 12,
    lineHeight: 16,
    color: color.paper[500],
  },
});
