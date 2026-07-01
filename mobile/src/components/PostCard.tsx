import { memo, useCallback, useState } from "react";
import type { NativeSyntheticEvent, TextLayoutEventData } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Post } from "@wroom/shared";
import { useStore, resolveAccount, relativeTime } from "@wroom/shared";

import { Avatar } from "./Avatar";
import { RichText } from "./RichText";
import { useWroomTheme, fonts, space, type } from "@/theme/theme";

interface Props {
  post: Post;
  emphasis?: boolean;
}

/** Posts longer than this collapse behind a "Show more" toggle in feeds. */
const COLLAPSED_LINES = 12;

/**
 * Caches the measured "does this body overflow COLLAPSED_LINES" decision per
 * post.id. Rows are recycled in the virtualized FlatList, so without this a
 * post re-runs its one-shot measuring pass every time it scrolls back into
 * view — producing a visible height pop. This is a render-perf cache, not app
 * state, so a module-level Map is acceptable.
 */
const overflowCache = new Map<string, boolean>();

/** A single post, rendered with the editorial serif used for writing. */
export const PostCard = memo(function PostCard({ post, emphasis }: Props) {
  const { db, activeCharacterId, toggleLike, toggleRepost, flashPostId, showToast } = useStore();
  const router = useRouter();
  const t = useWroomTheme();

  // Collapse long bodies in the feed; `needsToggle === null` is the one-shot
  // measuring pass that decides whether the post overflows COLLAPSED_LINES.
  // Seed from the per-id cache so already-measured posts (e.g. recycled rows
  // scrolling back in) render at their final clamp on first paint - no
  // re-measure, no height pop. `expanded` stays per-mount. These hooks run
  // before the early return below so hook order stays stable across renders.
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState<boolean | null>(
    () => overflowCache.get(post.id) ?? null
  );
  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      const overflows = e.nativeEvent.lines.length > COLLAPSED_LINES;
      overflowCache.set(post.id, overflows);
      setNeedsToggle((prev) => (prev === null ? overflows : prev));
    },
    [post.id]
  );

  const author = resolveAccount(db, post.characterId);
  if (!author) return null;

  const name = author.kind === "character" ? author.displayName : author.name;
  const accent = author.accentColor;
  const liked = activeCharacterId ? post.likedBy.includes(activeCharacterId) : false;
  const reposted = activeCharacterId ? post.repostedBy.includes(activeCharacterId) : false;
  const replyCount = db.posts.filter((p) => p.parentPostId === post.id).length;
  const flash = flashPostId === post.id;

  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [
        styles.card,
        { borderBottomColor: t.border, backgroundColor: flash ? t.surface2 : "transparent" },
        emphasis && { backgroundColor: t.surface },
        pressed && { backgroundColor: t.surface2 },
      ]}
    >
      <Pressable onPress={() => router.push(`/profile/${post.characterId}`)} hitSlop={6}>
        <Avatar name={name} src={author.avatar} accent={accent} size={42} />
      </Pressable>

      <View style={styles.main}>
        <View style={styles.head}>
          <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.meta, { color: t.ink3 }]} numberOfLines={1}>
            @{author.handle}
            {author.kind === "world" ? " · world" : ""} · {relativeTime(post.createdAt)}
          </Text>
        </View>

        <Text
          style={[styles.body, { color: t.ink }]}
          onTextLayout={needsToggle === null ? onTextLayout : undefined}
          numberOfLines={
            needsToggle === null
              ? COLLAPSED_LINES + 1
              : expanded
                ? undefined
                : COLLAPSED_LINES
          }
        >
          <RichText text={post.body} />
        </Text>
        {needsToggle && (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "flex-start" })}
          >
            <Text style={[styles.more, { color: accent }]}>
              {expanded ? "Show less" : "Show more"}
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Action
            icon="message-circle"
            count={replyCount}
            color={t.ink3}
            onPress={() => router.push(`/post/${post.id}`)}
          />
          <Action
            icon="repeat"
            count={post.repostedBy.length}
            color={reposted ? "#3fa66a" : t.ink3}
            dimmed={!activeCharacterId}
            onPress={() =>
              activeCharacterId
                ? toggleRepost(post.id, activeCharacterId)
                : showToast("Step into a character to react")
            }
          />
          <Action
            icon="heart"
            count={post.likedBy.length}
            color={liked ? t.danger : t.ink3}
            fill={liked}
            dimmed={!activeCharacterId}
            onPress={() =>
              activeCharacterId
                ? toggleLike(post.id, activeCharacterId)
                : showToast("Step into a character to react")
            }
          />
        </View>
      </View>
    </Pressable>
  );
});

function Action({
  icon,
  count,
  color,
  fill,
  dimmed,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  count: number;
  color: string;
  fill?: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.action, { opacity: dimmed ? 0.45 : pressed ? 0.6 : 1 }]}
    >
      <Feather name={icon} size={17} color={color} style={fill ? undefined : undefined} />
      {count > 0 && <Text style={[styles.count, { color }]}>{count}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, gap: space[1] },
  head: { gap: 1 },
  name: { fontFamily: fonts.serif, fontSize: type.base, fontWeight: "600" },
  meta: { fontSize: type.xs },
  body: { fontFamily: fonts.serif, fontSize: type.base, lineHeight: type.base * 1.45 },
  more: { fontSize: type.sm, fontWeight: "600", marginTop: space[1] },
  actions: { flexDirection: "row", gap: space[6], marginTop: space[2] },
  action: { flexDirection: "row", alignItems: "center", gap: space[2] },
  count: { fontSize: type.xs, fontVariant: ["tabular-nums"] },
});
