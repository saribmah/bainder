import type { ReactNode } from "react";
import { Redirect, usePathname, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { color } from "@bainder/ui";
import { authClient } from "./auth.client.ts";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const inSignIn = segments[0] === "signin";
  const inSignUp = segments[0] === "signup";
  const inLanding = pathname === "/";
  const inPublicRoute = inLanding || inSignIn || inSignUp;
  const isAuthed = !!session.data?.user;

  if (session.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.paper[500]} />
      </View>
    );
  }
  if (!isAuthed && !inPublicRoute) {
    return <Redirect href="/" />;
  }
  if (isAuthed && (inSignIn || inSignUp)) {
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
