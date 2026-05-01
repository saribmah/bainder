import type { ReactNode } from "react";
import { Redirect, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { color } from "@bainder/ui";
import { authClient } from "./auth.client.ts";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const segments = useSegments();
  const inSignIn = segments[0] === "signin";
  const isAuthed = !!session.data?.user;

  if (session.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.paper[500]} />
      </View>
    );
  }
  if (!isAuthed && !inSignIn) {
    return <Redirect href="/signin" />;
  }
  if (isAuthed && inSignIn) {
    return <Redirect href="/library" />;
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.paper[50],
  },
});
