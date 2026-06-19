import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useWroomTheme, type } from "@/theme/theme";

/**
 * A char-count ring that fills as you type and shifts accent → warm → red as
 * the limit nears. Over the limit it shows the overflow as a red number.
 */
export function CharCountRing({ count, limit, size = 30 }: { count: number; limit: number; size?: number }) {
  const t = useWroomTheme();
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = Math.min(1, count / limit);
  const remaining = limit - count;
  const over = remaining < 0;
  const near = remaining <= 20 && !over;

  const color = over ? t.danger : near ? "#d98324" : t.accent;

  return (
    <View style={styles.wrap}>
      {(near || over) && (
        <Text style={[styles.num, { color: over ? t.danger : t.ink2 }]}>{remaining}</Text>
      )}
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.border} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={over ? stroke + 1 : stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - (over ? 1 : ratio))}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  num: { fontSize: type.xs, fontVariant: ["tabular-nums"] },
});
