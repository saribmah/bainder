import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@bainder/ui";
import { AuthGate } from "../src/auth/AuthGate.tsx";
import { SDKProvider } from "../src/sdk/sdk.provider.tsx";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider defaultTheme="light">
        <SDKProvider>
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            />
          </AuthGate>
          <StatusBar style="auto" />
        </SDKProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
