import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { color } from "@bainder/ui";
import { authClient } from "../src/features/auth";
import { LandingScreen } from "../src/features/landing";

export default function Index() {
  const session = authClient.useSession();
  if (session.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.paper[500]} />
      </View>
    );
  }
  if (session.data?.user) {
    return <Redirect href="/dashboard" />;
  }
  return <LandingScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.paper[50],
  },
});
