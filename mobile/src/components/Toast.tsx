import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@wroom/shared";

import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/**
 * App-wide transient feedback. Mounted once at the root so any screen's
 * `showToast(...)` is actually seen — confirmations ("Posted ✦") and errors
 * (a failed password change) alike. Slides up from the bottom, then fades.
 */
export function Toast() {
  const { toast } = useStore();
  const t = useWroomTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    return () => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    };
  }, [toast, anim]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + space[6] },
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        },
      ]}
    >
      <Pressable style={[styles.toast, { backgroundColor: t.ink, shadowColor: "#000" }]}>
        <Text style={[styles.text, { color: t.bg }]} numberOfLines={3}>
          {toast}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: space[4],
    right: space[4],
    alignItems: "center",
  },
  toast: {
    maxWidth: 480,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.pill,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { fontFamily: fonts.serif, fontSize: type.sm, fontWeight: "600", textAlign: "center" },
});
