import { Animated, Platform, Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Feather } from "@expo/vector-icons";
import { useStore } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { useTabBarOpacity } from "@/components/TabBarChrome";
import { useWroomTheme, radius, space } from "@/theme/theme";

/** Slightly shorter than the native tab bar — content row height. Exported so
 *  scrollable screens can pad their content to clear the floating bar. */
export const TAB_BAR_HEIGHT = 52;

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  feed: "home",
  room: "users",
  notifications: "bell",
  settings: "settings",
};

/**
 * Custom liquid-glass bottom bar. Layout, left→right:
 *   [persona face] [feed] [your wroom] [bell] [settings]
 * The persona face is an extra leading button that jumps to the active
 * persona's profile (or the room when stepped out); the other four are the
 * real tab routes. The whole bar is one glass surface, sits a touch shorter,
 * and fades slightly while a screen is scrolling (see TabBarChrome).
 */
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useWroomTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const opacity = useTabBarOpacity();
  const { activeCharacter, unreadNotificationCount } = useStore();

  const liquid = isLiquidGlassAvailable();

  const onPersonaPress = () => {
    if (activeCharacter) router.push(`/profile/${activeCharacter.id}`);
    else router.push("/(tabs)/room");
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom, opacity }]}
    >
      <View style={[styles.barShadow, { height: TAB_BAR_HEIGHT }]}>
        {liquid ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            colorScheme={scheme === "light" ? "light" : "dark"}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.fallback,
              { backgroundColor: withAlpha(t.surface, 0.82), borderTopColor: t.border },
            ]}
          />
        )}

        <View style={styles.row}>
          {/* Slot 0 — active persona avatar (jumps to its profile). */}
          <Pressable
            onPress={onPersonaPress}
            style={styles.slot}
            accessibilityRole="button"
            accessibilityLabel={activeCharacter ? `${activeCharacter.displayName}'s profile` : "Your wroom"}
            hitSlop={6}
          >
            {activeCharacter ? (
              <View style={[styles.personaRing, { borderColor: activeCharacter.accentColor }]}>
                <Avatar
                  name={activeCharacter.displayName}
                  src={activeCharacter.avatar}
                  accent={activeCharacter.accentColor}
                  size={28}
                />
              </View>
            ) : (
              <Feather name="user" size={22} color={t.ink3} />
            )}
          </Pressable>

          {/* Slots 1–4 — the real tab routes. */}
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icon = ICONS[route.name] ?? "circle";
            const isBell = route.name === "notifications";
            const showBadge = isBell && unreadNotificationCount > 0;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.slot}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={route.name}
                hitSlop={6}
              >
                <View>
                  <Feather name={icon} size={22} color={focused ? t.accent : t.ink3} />
                  {showBadge && (
                    <View style={[styles.badge, { backgroundColor: t.accent, borderColor: t.bg }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

/** Apply an alpha to a hex (#rrggbb) or rgb/rgba color for the fallback bg. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[3],
  },
  barShadow: {
    marginHorizontal: space[2],
    borderRadius: radius.pill,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 8 },
      default: {},
    }),
  },
  fallback: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  slot: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%" },
  personaRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
