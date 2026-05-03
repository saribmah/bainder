import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icons, Toast, color } from "@bainder/ui";
import { BottomTabs } from "../../src/features/shell";
import { useLibraryDocuments } from "../../src/features/library/hooks/useLibraryDocuments";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { uploadDocument, toast } = useLibraryDocuments();

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <BottomTabs {...props} onUpload={uploadDocument} />}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="library" />
        <Tabs.Screen name="highlights" />
        <Tabs.Screen name="notes" />
        <Tabs.Screen name="settings" />
      </Tabs>

      {toast && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 24, right: 24, bottom: insets.bottom + 78 }}
        >
          <Toast iconStart={<Icons.Check size={18} color={color.status.success} />}>{toast}</Toast>
        </View>
      )}
    </>
  );
}
