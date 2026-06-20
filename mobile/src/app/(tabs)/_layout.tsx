import { Tabs } from "expo-router";

import { GlassTabBar } from "@/components/GlassTabBar";
import { TabBarChromeProvider } from "@/components/TabBarChrome";

/**
 * Custom JS tab bar (replaces the native tab bar) so we can render a liquid-glass
 * surface, a persona avatar, a notifications badge, and a scroll-driven fade.
 * Bar order is set inside GlassTabBar; declaration order here is the route order
 * it iterates: feed, room (your wroom), notifications, settings.
 */
export default function TabsLayout() {
  return (
    <TabBarChromeProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <GlassTabBar {...props} />}
      >
        <Tabs.Screen name="feed" />
        <Tabs.Screen name="room" />
        <Tabs.Screen name="notifications" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </TabBarChromeProvider>
  );
}
