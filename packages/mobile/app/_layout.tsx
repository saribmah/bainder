import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, type Theme } from "@bainder/ui";
import { ProfileTheme } from "@bainder/sdk";
import { AuthGate } from "../src/features/auth";
import { ProfileProvider, useProfile } from "../src/features/profile";
import { SDKProvider } from "../src/sdk/sdk.provider.tsx";

void SplashScreen.preventAutoHideAsync();

const profileThemeToUi = (theme: ProfileTheme | undefined): Theme =>
  theme === ProfileTheme.Night ? "dark" : theme === ProfileTheme.Sepia ? "sepia" : "light";

const uiThemeToProfile = (theme: Theme): ProfileTheme =>
  theme === "dark"
    ? ProfileTheme.Night
    : theme === "sepia"
      ? ProfileTheme.Sepia
      : ProfileTheme.Light;

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
      <SDKProvider>
        <ProfileProvider>
          <ThemedAppShell />
        </ProfileProvider>
      </SDKProvider>
    </SafeAreaProvider>
  );
}

function ThemedAppShell() {
  const { profile, update } = useProfile();
  const theme = profileThemeToUi(profile?.readingTheme);
  return (
    <ThemeProvider
      theme={theme}
      onThemeChange={(next) => {
        void update({ readingTheme: uiThemeToProfile(next) });
      }}
    >
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </AuthGate>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
