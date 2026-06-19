import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Line } from "react-native-svg";
import { useStore } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/**
 * A light relationship sketch: the author's cast arranged on a ring with lines
 * for the follows between them, plus a plain-language follow list below.
 */
export default function GraphScreen() {
  const { db, myCharacters, currentAuthor } = useStore();
  const router = useRouter();
  const t = useWroomTheme();
  const win = useWindowDimensions();

  const size = Math.min(win.width - space[4] * 2, 360);
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size / 2 - 44;

  const nodes = useMemo(() => {
    const n = myCharacters.length;
    return myCharacters.map((c, i) => {
      const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      return { c, x: cx + ringR * Math.cos(angle), y: cy + ringR * Math.sin(angle) };
    });
  }, [myCharacters, cx, cy, ringR]);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => m.set(n.c.id, { x: n.x, y: n.y }));
    return m;
  }, [nodes]);

  const edges = useMemo(() => {
    const charIds = new Set(myCharacters.map((c) => c.id));
    return db.follows.filter((f) => charIds.has(f.followerId) && charIds.has(f.followeeId));
  }, [db.follows, myCharacters]);

  const NODE = 46;

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScreenHeader title="Relationships" />
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[7] }}>
        <Text style={[styles.intro, { color: t.ink2 }]}>
          Who follows whom across {currentAuthor?.name}'s cast.
        </Text>

        {myCharacters.length < 2 ? (
          <View style={styles.empty}>
            <Text style={styles.glyph}>✶</Text>
            <Text style={[styles.emptyTitle, { color: t.ink }]}>Not much of a web yet</Text>
            <Text style={[styles.emptyBody, { color: t.ink2 }]}>
              Create a few characters and have them follow each other to see the shape of your world.
            </Text>
          </View>
        ) : (
          <View style={[styles.graphWrap, { width: size, height: size }]}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              {edges.map((e) => {
                const a = pos.get(e.followerId);
                const b = pos.get(e.followeeId);
                if (!a || !b) return null;
                return <Line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={t.border} strokeWidth={1.4} />;
              })}
            </Svg>
            {nodes.map((n) => (
              <Pressable
                key={n.c.id}
                onPress={() => router.push(`/profile/${n.c.id}`)}
                style={[styles.node, { left: n.x - NODE / 2, top: n.y - NODE / 2, width: NODE }]}
              >
                <Avatar name={n.c.displayName} src={n.c.avatar} accent={n.c.accentColor} size={NODE} />
                <Text style={[styles.nodeLabel, { color: t.ink2 }]} numberOfLines={1}>
                  {n.c.displayName.split(" ")[0]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: t.ink3 }]}>Follow list</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          {myCharacters.map((c) => {
            const targets = db.follows
              .filter((f) => f.followerId === c.id)
              .map((f) => db.characters.find((x) => x.id === f.followeeId) ?? db.worldAccounts.find((x) => x.id === f.followeeId))
              .filter(Boolean);
            return (
              <View key={c.id} style={styles.listRow}>
                <Pressable onPress={() => router.push(`/profile/${c.id}`)}>
                  <Text style={[styles.who, { color: t.ink }]}>{c.displayName}</Text>
                </Pressable>
                <Text style={[styles.targets, { color: t.ink3 }]}>
                  {targets.length === 0
                    ? "follows no one"
                    : "follows " + targets.map((tg) => (tg && "displayName" in tg ? tg.displayName : tg?.name)).join(", ")}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  intro: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center" },
  empty: { alignItems: "center", padding: space[6], gap: space[3] },
  glyph: { fontSize: 32, color: "#9a8f7f" },
  emptyTitle: { fontFamily: fonts.serif, fontSize: type.xl, fontWeight: "600" },
  emptyBody: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", lineHeight: type.base * 1.5 },
  graphWrap: { alignSelf: "center", marginTop: space[4] },
  node: { position: "absolute", alignItems: "center", gap: 2 },
  nodeLabel: { fontSize: type.xs, fontWeight: "500" },
  sectionLabel: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: space[5], marginBottom: space[2] },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space[4] },
  listRow: { paddingVertical: space[3], gap: 2 },
  who: { fontFamily: fonts.serif, fontSize: type.base, fontWeight: "600" },
  targets: { fontSize: type.sm },
});
