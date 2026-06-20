import "@/config/platform"; // side effect: bind shared platform seam (must be first)

import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "@wroom/shared";

import { Toast } from "@/components/Toast";
import { useWroomTheme } from "@/theme/theme";

/**
 * Keep the visible route in sync with auth state: unauthenticated authors are
 * pushed to /auth; once signed in (or in the demo room) they land on the tabs.
 * Runs only after the persisted room has hydrated, so we never flash the auth
 * screen over a returning user.
 */
function useAuthGate() {
  const { currentAuthor, hydrated } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === "auth";
    if (!currentAuthor && !inAuth) {
      router.replace("/auth");
    } else if (currentAuthor && inAuth) {
      router.replace("/(tabs)/feed");
    }
  }, [currentAuthor, hydrated, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  const scheme = useColorScheme();
  const t = useWroomTheme();

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ animation: "fade" }} />
        <Stack.Screen name="index" options={{ animation: "fade" }} />
      </Stack>
      <Toast />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <RootNavigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
