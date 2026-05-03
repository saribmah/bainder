import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icons, color } from "@bainder/ui";
import { libraryStyles as styles } from "../library.styles";

type ActiveTab = "home" | "library" | "highlights" | "settings";

export function LibraryBottomTabs({
  active,
  bottom,
  onUpload,
}: {
  active: ActiveTab;
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
