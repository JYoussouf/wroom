import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  useStore,
  ancestorsOf,
  getPost,
  repliesTo,
  resolveAccount,
  fullTime,
} from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { RichText } from "@/components/RichText";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, activeCharacterId, toggleLike, toggleRepost, deletePost, myCharacters } = useStore();
  const router = useRouter();
  const t = useWroomTheme();

  const post = id ? getPost(db, id) : null;
  const isMine = !!post && myCharacters.some((c) => c.id === post.characterId);

  function confirmDelete() {
    if (!post) return;
    const replyCount = db.posts.filter((p) => p.parentPostId === post.id).length;
    Alert.alert(
      "Delete this post?",
      replyCount > 0
        ? `This post and its ${replyCount} ${replyCount === 1 ? "reply" : "replies"} will be permanently removed.`
        : "This post will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePost(post.id);
            router.back();
          },
        },
      ]
    );
  }
  const ancestors = useMemo(() => (id ? ancestorsOf(db, id) : []), [db, id]);
  const replies = useMemo(() => (id ? repliesTo(db, id) : []), [db, id]);

  if (!post) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <ScreenHeader title="Thread" />
        <Text style={[styles.gone, { color: t.ink2 }]}>This post is gone.</Text>
      </View>
    );
  }

  const author = resolveAccount(db, post.characterId);
  const name = author ? (author.kind === "character" ? author.displayName : author.name) : "Unknown";
  const accent = author?.accentColor ?? t.accent;
  const liked = activeCharacterId ? post.likedBy.includes(activeCharacterId) : false;
  const reposted = activeCharacterId ? post.repostedBy.includes(activeCharacterId) : false;

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScreenHeader
        title="Thread"
        right={
          isMine ? (
            <Pressable onPress={confirmDelete} hitSlop={10} accessibilityLabel="Delete post">
              <Feather name="trash-2" size={20} color={t.ink2} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: space[7] }}>
        {ancestors.map((a) => (
          <PostCard key={a.id} post={a} />
        ))}

        <View style={[styles.focus, { borderBottomColor: t.border }]}>
          <Pressable
            onPress={() => router.push(`/profile/${post.characterId}`)}
            style={styles.focusHead}
          >
            <Avatar name={name} src={author?.avatar} accent={accent} size={48} />
            <View>
              <Text style={[styles.focusName, { color: t.ink }]}>{name}</Text>
              <Text style={[styles.handle, { color: t.ink3 }]}>@{author?.handle}</Text>
            </View>
          </Pressable>

          <Text style={[styles.focusBody, { color: t.ink }]}><RichText text={post.body} /></Text>
          <Text style={[styles.time, { color: t.ink3 }]}>{fullTime(post.createdAt)}</Text>

          {(post.likedBy.length > 0 || post.repostedBy.length > 0) && (
            <View style={[styles.stats, { borderTopColor: t.border, borderBottomColor: t.border }]}>
              {post.repostedBy.length > 0 && (
                <Text style={[styles.stat, { color: t.ink2 }]}>
                  <Text style={styles.statNum}>{post.repostedBy.length}</Text>{" "}
                  {post.repostedBy.length === 1 ? "repost" : "reposts"}
                </Text>
              )}
              {post.likedBy.length > 0 && (
                <Text style={[styles.stat, { color: t.ink2 }]}>
                  <Text style={styles.statNum}>{post.likedBy.length}</Text>{" "}
                  {post.likedBy.length === 1 ? "like" : "likes"}
                </Text>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <FocusAction
              icon="message-circle"
              label="Reply"
              color={t.ink2}
              disabled={!activeCharacterId}
              onPress={() => router.push(`/compose?replyTo=${post.id}`)}
            />
            <FocusAction
              icon="repeat"
              color={reposted ? "#3fa66a" : t.ink2}
              disabled={!activeCharacterId}
              onPress={() => activeCharacterId && toggleRepost(post.id, activeCharacterId)}
            />
            <FocusAction
              icon="heart"
              color={liked ? t.danger : t.ink2}
              disabled={!activeCharacterId}
              onPress={() => activeCharacterId && toggleLike(post.id, activeCharacterId)}
            />
          </View>
        </View>

        {activeCharacterId && (
          <Pressable
            onPress={() => router.push(`/compose?replyTo=${post.id}`)}
            style={[styles.replyEntry, { borderColor: t.border }]}
          >
            <Feather name="message-circle" size={16} color={t.ink3} />
            <Text style={[styles.replyEntryText, { color: t.ink3 }]}>
              Reply as the active character…
            </Text>
          </Pressable>
        )}

        <Text style={[styles.sectionLabel, { color: t.ink3 }]}>
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </Text>
        {replies.map((r) => (
          <PostCard key={r.id} post={r} />
        ))}
        {replies.length === 0 && (
          <Text style={[styles.noReplies, { color: t.ink3 }]}>No replies yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function FocusAction({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label?: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [styles.focusAction, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Feather name={icon} size={20} color={color} />
      {label && <Text style={[styles.focusActionLabel, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gone: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", padding: space[6] },
  focus: { padding: space[4], borderBottomWidth: StyleSheet.hairlineWidth, gap: space[2] },
  focusHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  focusName: { fontFamily: fonts.serif, fontSize: type.lg, fontWeight: "600" },
  handle: { fontSize: type.sm },
  focusBody: { fontFamily: fonts.serif, fontSize: type.xl, lineHeight: type.xl * 1.4, marginTop: space[2] },
  time: { fontSize: type.sm },
  stats: { flexDirection: "row", gap: space[4], paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: space[2] },
  stat: { fontSize: type.sm },
  statNum: { fontWeight: "700" },
  actions: { flexDirection: "row", gap: space[7], marginTop: space[2] },
  focusAction: { flexDirection: "row", alignItems: "center", gap: space[2] },
  focusActionLabel: { fontSize: type.sm, fontWeight: "500" },
  replyEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    margin: space[4],
    padding: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  replyEntryText: { fontFamily: fonts.serif, fontSize: type.sm },
  sectionLabel: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: space[4], paddingVertical: space[3] },
  noReplies: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", padding: space[5] },
});
