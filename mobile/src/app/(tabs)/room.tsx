import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, postCount, followerCount } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

export default function RoomScreen() {
  const { db, myCharacters, activeCharacterId, stepInto, stepOut } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useWroomTheme();

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <FlatList
        data={myCharacters}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{
          paddingTop: insets.top + space[4],
          paddingBottom: insets.bottom + space[7],
          paddingHorizontal: space[4],
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.ink }]}>Your room</Text>
            <Text style={[styles.sub, { color: t.ink2 }]}>
              {myCharacters.length} character{myCharacters.length === 1 ? "" : "s"} · step into one to write
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const active = item.id === activeCharacterId;
          return (
            <Pressable
              onPress={() => (active ? stepOut() : stepInto(item.id))}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? t.surface2 : t.surface,
                  borderColor: active ? item.accentColor : t.border,
                  borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Avatar name={item.displayName} src={item.avatar} accent={item.accentColor} size={48} />
              <View style={styles.cardMain}>
                <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={[styles.meta, { color: t.ink3 }]} numberOfLines={1}>
                  @{item.handle} · {postCount(db, item.id)} posts · {followerCount(db, item.id)} followers
                </Text>
                {!!item.voiceNote && (
                  <Text style={[styles.voice, { color: t.ink2 }]} numberOfLines={1}>
                    {item.voiceNote}
                  </Text>
                )}
              </View>
              <Text style={[styles.step, { color: active ? item.accentColor : t.ink3 }]}>
                {active ? "Stepped in" : "Step in"}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            onPress={() => router.push("/character/new")}
            style={[styles.newBtn, { borderColor: t.border }]}
          >
            <Text style={[styles.newText, { color: t.accent }]}>+ New character</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { marginBottom: space[4] },
  title: { fontFamily: fonts.serif, fontSize: type.xxl, fontWeight: "700" },
  sub: { fontSize: type.sm, marginTop: space[1] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    marginBottom: space[3],
  },
  cardMain: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.serif, fontSize: type.lg, fontWeight: "600" },
  meta: { fontSize: type.xs },
  voice: { fontSize: type.sm, fontStyle: "italic", marginTop: space[1] },
  step: { fontSize: type.xs, fontWeight: "600" },
  newBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    paddingVertical: space[4],
    alignItems: "center",
    marginTop: space[2],
  },
  newText: { fontSize: type.base, fontWeight: "600" },
});
