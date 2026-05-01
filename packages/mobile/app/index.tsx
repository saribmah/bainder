import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { color } from "@bainder/ui";
import { authClient } from "../src/auth/auth.client.ts";

export default function Index() {
  const session = authClient.useSession();
  if (session.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.paper[500]} />
      </View>
    );
  }
  return <Redirect href={session.data?.user ? "/library" : "/signin"} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.paper[50],
  },
});
