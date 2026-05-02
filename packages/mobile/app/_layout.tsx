import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@bainder/ui";
import { AuthGate } from "../src/auth/AuthGate.tsx";
import { SDKProvider } from "../src/sdk/sdk.provider.tsx";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces: require("../assets/fonts/Fraunces.ttf"),
    "Inter Tight": require("../assets/fonts/InterTight.ttf"),
    Newsreader: require("../assets/fonts/Newsreader.ttf"),
    "JetBrains Mono": require("../assets/fonts/JetBrainsMono.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
