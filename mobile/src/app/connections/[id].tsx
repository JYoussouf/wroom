import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { Account } from "@wroom/shared";
import { useStore, followerIds, followingIds, resolveAccount } from "@wroom/shared";

import { AccountRow } from "@/components/AccountRow";
import { NewWorldAccountSheet } from "@/components/NewWorldAccountSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

export default function ConnectionsScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: "followers" | "following" }>();
  const id = params.id;
  const { db, activeCharacterId, myCharacters, myWorldAccounts, toggleFollow } = useStore();
  const t = useWroomTheme();
  const [active, setActive] = useState<"followers" | "following">(params.tab ?? "following");
  const [worldSheet, setWorldSheet] = useState(false);

  const subject = id ? resolveAccount(db, id) : null;
  const name = subject ? (subject.kind === "character" ? subject.displayName : subject.name) : "Account";

  const list = useMemo<Account[]>(() => {
    if (!id) return [];
    const ids = active === "followers" ? followerIds(db, id) : followingIds(db, id);
    return ids.map((x) => resolveAccount(db, x)).filter((a): a is Account => a !== null);
  }, [db, id, active]);

  const isOwn = id === activeCharacterId;
  const discover = useMemo<Account[]>(() => {
    if (!activeCharacterId || !isOwn || active !== "following") return [];
    const followed = new Set(followingIds(db, activeCharacterId));
    const all: Account[] = [
      ...myCharacters.map((c) => ({ ...c, kind: "character" as const })),
      ...myWorldAccounts.map((w) => ({ ...w, kind: "world" as const })),
    ];
    return all.filter((a) => a.id !== activeCharacterId && !followed.has(a.id));
  }, [db, activeCharacterId, isOwn, active, myCharacters, myWorldAccounts]);

  const header = (
    <View style={styles.headerPad}>
      <View style={[styles.seg, { backgroundColor: t.bgSunken }]}>
        {(["following", "followers"] as const).map((tb) => (
          <Pressable key={tb} onPress={() => setActive(tb)} style={[styles.segBtn, active === tb && { backgroundColor: t.surface }]}>
            <Text style={[styles.segText, { color: active === tb ? t.ink : t.ink3 }]}>
              {tb === "following" ? "Following" : "Followers"}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScreenHeader title={name} />
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AccountRow account={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: space[7] }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: t.ink3 }]}>
            {active === "followers" ? `No one follows ${name} yet.` : `${name} isn't following anyone yet.`}
          </Text>
        }
        ListFooterComponent={
          isOwn && active === "following" ? (
            <View>
              <View style={styles.discoverHead}>
                <Text style={[styles.sectionLabel, { color: t.ink3 }]}>Add to {name}'s world</Text>
                <Pressable onPress={() => setWorldSheet(true)} style={styles.worldBtn}>
                  <Feather name="plus" size={15} color={t.accent} />
                  <Text style={[styles.worldBtnText, { color: t.accent }]}>World account</Text>
                </Pressable>
              </View>
              {discover.length === 0 ? (
                <Text style={[styles.empty, { color: t.ink3 }]}>
                  {name} already follows everyone in your wroom. Sketch a world account to widen their world.
                </Text>
              ) : (
                discover.map((a) => <AccountRow key={a.id} account={a} />)
              )}
            </View>
          ) : null
        }
      />
      <NewWorldAccountSheet
        open={worldSheet}
        onClose={() => setWorldSheet(false)}
        onCreated={(wid) => {
          if (activeCharacterId && isOwn) toggleFollow(activeCharacterId, wid);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerPad: { padding: space[4] },
  seg: { flexDirection: "row", borderRadius: radius.md, padding: 3, gap: 3 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: space[2], borderRadius: radius.sm },
  segText: { fontSize: type.sm, fontWeight: "600" },
  empty: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", padding: space[5] },
  discoverHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space[4], paddingTop: space[5], paddingBottom: space[2] },
  sectionLabel: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  worldBtn: { flexDirection: "row", alignItems: "center", gap: space[1] },
  worldBtnText: { fontSize: type.sm, fontWeight: "600" },
});
