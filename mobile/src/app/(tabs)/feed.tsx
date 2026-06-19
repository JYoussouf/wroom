import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, wroomFeed, homeTimeline } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

type Tab = "foryou" | "following";

export default function FeedScreen() {
  const { db, currentAuthor, activeCharacter, myCharacters } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useWroomTheme();
  const [tab, setTab] = useState<Tab>("foryou");

  const forYou = useMemo(
    () => (currentAuthor ? wroomFeed(db, currentAuthor.id) : []),
    [db, currentAuthor]
  );
  const following = useMemo(
    () => (activeCharacter ? homeTimeline(db, activeCharacter.id) : []),
    [db, activeCharacter]
  );
  const posts = tab === "foryou" ? forYou : following;

  function compose() {
    if (activeCharacter) router.push("/compose");
    else router.push("/(tabs)/room");
  }

  const composerName = activeCharacter?.displayName.split(" ")[0];

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <View style={[styles.topbar, { paddingTop: insets.top, borderBottomColor: t.border }]}>
        <View style={styles.tabs}>
          {(["foryou", "following"] as const).map((tb) => (
            <Pressable key={tb} onPress={() => setTab(tb)} style={styles.tab}>
              <Text style={[styles.tabText, { color: tab === tb ? t.ink : t.ink3 }]}>
                {tb === "foryou" ? "For you" : "Following"}
              </Text>
              {tab === tb && <View style={[styles.tabUnderline, { backgroundColor: t.accent }]} />}
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[7] }}
        ListHeaderComponent={
          <Pressable
            onPress={compose}
            style={({ pressed }) => [
              styles.composer,
              { borderBottomColor: t.border, backgroundColor: pressed ? t.surface2 : "transparent" },
            ]}
          >
            <Avatar
              name={activeCharacter?.displayName ?? currentAuthor?.name ?? "You"}
              src={activeCharacter?.avatar ?? currentAuthor?.avatar}
              accent={activeCharacter?.accentColor ?? t.accent}
              size={42}
            />
            <Text style={[styles.composerText, { color: t.ink3 }]} numberOfLines={1}>
              {activeCharacter ? `What's on ${composerName}'s mind?` : "Step into a character to write…"}
            </Text>
            <View style={[styles.postBtn, { backgroundColor: t.accent }]}>
              <Text style={[styles.postBtnText, { color: t.accentInk }]}>Post</Text>
            </View>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.glyph}>✶</Text>
            <Text style={[styles.emptyTitle, { color: t.ink }]}>
              {tab === "following" && !activeCharacter ? "No one stepped in" : "A quiet timeline"}
            </Text>
            <Text style={[styles.emptyBody, { color: t.ink2 }]}>
              {tab === "following" && !activeCharacter
                ? "Step into one of your characters to see the world through their eyes."
                : myCharacters.length === 0
                  ? "Invent your first character and write their opening line."
                  : "Nothing written yet. Step into a character and post the first line."}
            </Text>
            <Pressable onPress={compose} style={[styles.emptyBtn, { backgroundColor: t.accent }]}>
              <Text style={[styles.postBtnText, { color: t.accentInk }]}>
                {activeCharacter ? "Write a post" : "Choose a character"}
              </Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          posts.length > 0 ? (
            <Text style={[styles.footer, { color: t.ink3 }]}>
              ✦ Everything here is invented fiction.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topbar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabs: { flexDirection: "row" },
  tab: { flex: 1, alignItems: "center", paddingVertical: space[3] },
  tabText: { fontSize: type.sm, fontWeight: "600" },
  tabUnderline: { height: 2, width: 28, borderRadius: 2, marginTop: space[2] },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composerText: { flex: 1, fontFamily: fonts.serif, fontSize: type.base },
  postBtn: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill },
  postBtnText: { fontSize: type.sm, fontWeight: "600" },
  empty: { alignItems: "center", padding: space[6], gap: space[3] },
  glyph: { fontSize: 32, color: "#9a8f7f" },
  emptyTitle: { fontFamily: fonts.serif, fontSize: type.xl, fontWeight: "600" },
  emptyBody: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", lineHeight: type.base * 1.5 },
  emptyBtn: { paddingHorizontal: space[5], paddingVertical: space[3], borderRadius: radius.pill, marginTop: space[2] },
  footer: { textAlign: "center", fontSize: type.xs, padding: space[5] },
});
