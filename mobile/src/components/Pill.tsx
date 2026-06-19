import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Privacy } from "@wroom/shared";
import { useWroomTheme, radius, space, type } from "@/theme/theme";

/** A small bordered chip used for flavor tags, world labels, etc. */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  const t = useWroomTheme();
  const accent = tone === "accent";
  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: t.border,
          backgroundColor: accent ? t.surface2 : t.surface2,
        },
      ]}
    >
      {typeof children === "string" ? (
        <Text style={[styles.text, { color: accent ? t.accent : t.ink2 }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/** A small, always-legible indicator of a character's privacy state. */
export function PrivacyBadge({ privacy, withLabel = false }: { privacy: Privacy; withLabel?: boolean }) {
  const t = useWroomTheme();
  const isPrivate = privacy === "private";
  const color = isPrivate ? t.ink2 : t.accent;
  return (
    <View style={[styles.pill, { borderColor: t.border, backgroundColor: t.surface2, paddingHorizontal: withLabel ? space[3] : space[2] }]}>
      <Feather name={isPrivate ? "lock" : "globe"} size={12} color={color} />
      {withLabel && <Text style={[styles.text, { color }]}>{isPrivate ? "Private" : "Shareable"}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: 4,
  },
  text: { fontSize: type.xs, fontWeight: "500" },
});
