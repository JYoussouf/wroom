import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useWroomTheme, fonts, space, type } from "@/theme/theme";

interface Props {
  title?: string;
  /** Right-aligned content (e.g. a Post button). */
  right?: ReactNode;
  /** Use an ✕ instead of a back chevron (for modal-style screens). */
  close?: boolean;
}

/** Shared top bar: hides the native header, draws a back/close + title + action. */
export function ScreenHeader({ title, right, close }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useWroomTheme();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.side}>
          <Feather name={close ? "x" : "chevron-left"} size={24} color={t.ink} />
        </Pressable>
        <Text style={[styles.title, { color: t.ink }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { minWidth: 44, height: 40, justifyContent: "center" },
  right: { alignItems: "flex-end" },
  title: { flex: 1, textAlign: "center", fontFamily: fonts.serif, fontSize: type.lg, fontWeight: "600" },
});
