import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icons, color } from "@bainder/ui";
import { dashboardStyles as styles } from "../dashboard.styles";

export function BottomTabs({ bottom, onUpload }: { bottom: number; onUpload: () => void }) {
  const router = useRouter();
  const tabs = [
    { icon: Icons.Home, name: "Home", active: true },
    { icon: Icons.Library, name: "Library", onPress: () => router.push("/library") },
    { icon: Icons.Plus, name: "Add", primary: true, onPress: onUpload },
    { icon: Icons.Highlight, name: "Highlights", onPress: () => router.push("/highlights") },
    { icon: Icons.User, name: "You", onPress: () => router.push("/settings") },
  ];

  return (
    <View style={[styles.tabs, { paddingBottom: bottom + 10 }]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.name}
          accessibilityRole="button"
          onPress={tab.onPress}
          style={styles.tabItem}
        >
          {tab.primary ? (
            <View style={styles.primaryTab}>
              <tab.icon size={20} color={color.paper[50]} />
            </View>
          ) : (
            <tab.icon
              size={22}
              color={tab.active ? color.paper[900] : color.paper[500]}
              strokeWidth={tab.active ? 2 : 1.5}
            />
          )}
          <Text style={[styles.tabLabel, tab.active ? styles.tabLabelActive : null]}>
            {tab.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
