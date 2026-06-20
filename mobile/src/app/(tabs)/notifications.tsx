import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  useStore,
  resolveAccount,
  accountName,
  getCharacter,
  relativeTime,
  type Notification,
  type NotificationKind,
} from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { useTabBarScroll } from "@/components/TabBarChrome";
import { TAB_BAR_HEIGHT } from "@/components/GlassTabBar";
import { useWroomTheme, fonts, space, type } from "@/theme/theme";

const VERB: Record<NotificationKind, string> = {
  like: "liked",
  repost: "reposted",
  reply: "replied to",
  follow: "started following",
  relationship: "wants a bond with",
};

const ICON: Record<NotificationKind, keyof typeof Feather.glyphMap> = {
  like: "heart",
  repost: "repeat",
  reply: "message-circle",
  follow: "user-plus",
  relationship: "link",
};

export default function NotificationsScreen() {
  const { db, notifications, markNotificationsRead } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useWroomTheme();
  const scroll = useTabBarScroll();

  // Clear the unread badge whenever the author opens this tab.
  useFocusEffect(
    useCallback(() => {
      markNotificationsRead();
    }, [markNotificationsRead])
  );

  const open = (n: Notification) => {
    if (n.kind === "relationship") router.push(`/connections/${n.subjectCharacterId}`);
    else if (n.kind === "follow") router.push(`/profile/${n.actorId}`);
    else if (n.postId) router.push(`/post/${n.postId}`);
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <View style={[styles.topbar, { paddingTop: insets.top + space[2], borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.ink }]}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        {...scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + space[4] }}
        renderItem={({ item }) => {
          const actor = resolveAccount(db, item.actorId);
          const subject = getCharacter(db, item.subjectCharacterId);
          return (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: t.border, backgroundColor: pressed ? t.surface2 : "transparent" },
              ]}
            >
              <View style={styles.avatarWrap}>
                <Avatar
                  name={accountName(actor)}
                  src={actor?.kind === "character" ? actor.avatar : actor?.avatar}
                  accent={actor?.accentColor ?? t.accent}
                  size={40}
                />
                <View style={[styles.kindBadge, { backgroundColor: t.surface, borderColor: t.bg }]}>
                  <Feather name={ICON[item.kind]} size={11} color={t.accent} />
                </View>
              </View>
              <View style={styles.body}>
                <Text style={[styles.text, { color: t.ink }]} numberOfLines={2}>
                  <Text style={styles.bold}>{accountName(actor)}</Text>{" "}
                  {VERB[item.kind]}{" "}
                  <Text style={styles.bold}>{subject?.displayName ?? "you"}</Text>
                  {item.kind === "like" || item.kind === "repost" || item.kind === "reply"
                    ? "'s post"
                    : ""}
                </Text>
                <Text style={[styles.time, { color: t.ink3 }]}>{relativeTime(item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.glyph}>✶</Text>
            <Text style={[styles.emptyTitle, { color: t.ink }]}>Nothing yet</Text>
            <Text style={[styles.emptyBody, { color: t.ink2 }]}>
              Likes, replies, new followers, and bond requests across your characters land here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topbar: { paddingHorizontal: space[4], paddingBottom: space[3], borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.serif, fontSize: type.xxl, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { width: 40, height: 40 },
  kindBadge: {
    position: "absolute",
    bottom: -2,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  text: { fontSize: type.base, lineHeight: type.base * 1.35 },
  bold: { fontWeight: "700" },
  time: { fontSize: type.xs },
  empty: { alignItems: "center", padding: space[7], gap: space[3] },
  glyph: { fontSize: 32, color: "#9a8f7f" },
  emptyTitle: { fontFamily: fonts.serif, fontSize: type.xl, fontWeight: "600" },
  emptyBody: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", lineHeight: type.base * 1.5 },
});
