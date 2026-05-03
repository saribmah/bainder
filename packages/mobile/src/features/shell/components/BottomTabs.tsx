import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icons, color, font, radius } from "@bainder/ui";

export type BottomTabKey = "home" | "library" | "highlights" | "settings";

export function BottomTabs({
  active,
  bottom,
  onUpload,
}: {
  active: BottomTabKey;
  bottom: number;
  onUpload: () => void;
}) {
  const router = useRouter();
  const tabs = [
    { key: "home", icon: Icons.Home, name: "Home", onPress: () => router.push("/dashboard") },
    {
      key: "library",
      icon: Icons.Library,
      name: "Library",
      onPress: () => router.push("/library"),
    },
    { key: "add", icon: Icons.Plus, name: "Add", primary: true, onPress: onUpload },
    {
      key: "highlights",
      icon: Icons.Highlight,
      name: "Highlights",
      onPress: () => router.push("/highlights"),
    },
    { key: "settings", icon: Icons.User, name: "You", onPress: () => router.push("/settings") },
  ] as const;

  return (
    <View style={[styles.tabs, { paddingBottom: bottom + 10 }]}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            onPress={tab.onPress}
            style={styles.tabItem}
          >
            {"primary" in tab && tab.primary ? (
              <View style={styles.primaryTab}>
                <tab.icon size={20} color={color.paper[50]} />
              </View>
            ) : (
              <tab.icon
                size={22}
                color={selected ? color.paper[900] : color.paper[500]}
                strokeWidth={selected ? 2 : 1.5}
              />
            )}
            <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : null]}>
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: color.paper[200],
    backgroundColor: color.paper[50],
    paddingTop: 12,
  },
  tabItem: {
    minWidth: 54,
    alignItems: "center",
    gap: 4,
  },
  primaryTab: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.paper[900],
  },
  tabLabel: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 10,
    color: color.paper[500],
  },
  tabLabelActive: {
    color: color.paper[900],
    fontWeight: "600",
  },
});
