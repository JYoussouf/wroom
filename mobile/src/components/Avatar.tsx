import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { inkOn } from "@wroom/shared";
import { fonts } from "@/theme/theme";

interface AvatarProps {
  name: string;
  src?: string;
  accent: string;
  size?: number;
  /** Square (rounded-rect) instead of circle — used in a few editorial spots. */
  square?: boolean;
}

/** Up-to-two-letter monogram from a display name. */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Image avatar, or a generated monogram on the accent as fallback. */
export function Avatar({ name, src, accent, size = 44, square = false }: AvatarProps) {
  const borderRadius = square ? size * 0.28 : size / 2;
  const base = { width: size, height: size, borderRadius };

  if (src) {
    return <Image source={{ uri: src }} style={base} contentFit="cover" />;
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[base, styles.fallback, { backgroundColor: accent }]}
    >
      <Text style={[styles.mono, { color: inkOn(accent), fontSize: size * 0.4 }]}>
        {monogram(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
  mono: { fontFamily: fonts.serif, fontWeight: "600" },
});
