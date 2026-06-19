import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useWroomTheme } from "@/theme/theme";

/**
 * Boot screen. The root layout's auth gate redirects away from here as soon as
 * the persisted room hydrates — to /auth when signed out, or /(tabs)/feed when
 * a session (or the demo room) is present.
 */
export default function BootScreen() {
  const t = useWroomTheme();
  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ActivityIndicator color={t.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
