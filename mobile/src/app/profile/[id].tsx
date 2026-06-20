import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  useStore,
  followerCount,
  followingCount,
  postCount,
  profilePosts,
  profileTimeline,
  resolveAccount,
} from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { RichText } from "@/components/RichText";
import { Pill, PrivacyBadge } from "@/components/Pill";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, activeCharacterId, isFollowing, toggleFollow, stepInto, stepOut } = useStore();
  const router = useRouter();
  const t = useWroomTheme();
  const [tab, setTab] = useState<"posts" | "replies">("posts");

  const acc = id ? resolveAccount(db, id) : null;

  const posts = useMemo(() => (id ? profilePosts(db, id) : []), [db, id]);
  const all = useMemo(() => (id ? profileTimeline(db, id) : []), [db, id]);
  const replies = useMemo(() => all.filter((p) => p.parentPostId), [all]);

  if (!acc || !id) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <ScreenHeader title="Profile" />
        <Text style={[styles.gone, { color: t.ink2 }]}>This account no longer exists.</Text>
      </View>
    );
  }

  const name = acc.kind === "character" ? acc.displayName : acc.name;
  const accent = acc.accentColor;
  const shown = tab === "posts" ? posts : replies;
  const isSelf = id === activeCharacterId;
  const isMineToEdit = acc.kind === "character" && acc.authorId === db.session.authorId;
  const following = activeCharacterId ? isFollowing(activeCharacterId, id) : false;
  const flavors =
    acc.kind === "character"
      ? [acc.pronouns, acc.occupation, acc.location, acc.eraTag].filter(Boolean)
      : [];

  const header = (
    <View>
      {acc.kind === "character" && acc.banner ? (
        <Image source={{ uri: acc.banner }} style={[styles.banner, { backgroundColor: accent }]} contentFit="cover" />
      ) : (
        <View style={[styles.banner, { backgroundColor: accent }]} />
      )}

      <View style={styles.body}>
        <View style={styles.headRow}>
          <View style={[styles.avatarWrap, { borderColor: t.bg }]}>
            <Avatar name={name} src={acc.avatar} accent={accent} size={84} />
          </View>
          <View style={styles.actions}>
            {isMineToEdit && (
              <Pressable
                onPress={() => (isSelf ? stepOut() : stepInto(id))}
                style={[
                  styles.stepBtn,
                  isSelf
                    ? { backgroundColor: accent }
                    : { borderColor: t.border, borderWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Text style={[styles.stepText, { color: isSelf ? "#fff" : t.ink }]}>
                  {isSelf ? "Stepped in" : "Step in"}
                </Text>
              </Pressable>
            )}
            {isMineToEdit && (
              <SmallBtn label="Edit" t={t} onPress={() => router.push(`/character/edit/${id}`)} />
            )}
            {isMineToEdit && (
              <SmallBtn label="Share" icon="share" t={t} onPress={() => router.push(`/share/${id}`)} />
            )}
            {activeCharacterId && !isSelf && (
              <Pressable
                onPress={() => toggleFollow(activeCharacterId, id)}
                style={[
                  styles.followBtn,
                  following
                    ? { borderColor: t.border, borderWidth: StyleSheet.hairlineWidth }
                    : { backgroundColor: t.accent },
                ]}
              >
                <Text style={[styles.followText, { color: following ? t.ink : t.accentInk }]}>
                  {following ? "Following" : "Follow"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: t.ink }]}>{name}</Text>
          {acc.kind === "character" ? <PrivacyBadge privacy={acc.privacy} /> : <Pill>world account</Pill>}
        </View>
        <Text style={[styles.handle, { color: t.ink3 }]}>@{acc.handle}</Text>

        {acc.kind === "character" && (
          <>
            {!!acc.bio && <Text style={[styles.bio, { color: t.ink }]}><RichText text={acc.bio} /></Text>}
            {flavors.length > 0 && (
              <View style={styles.flavorRow}>
                {flavors.map((f) => (
                  <Pill key={f}>{f as string}</Pill>
                ))}
              </View>
            )}
            {!!acc.voiceNote && (
              <Text style={[styles.voice, { color: t.accent }]}>✦ “{acc.voiceNote}”</Text>
            )}
          </>
        )}

        <View style={styles.counts}>
          <Pressable onPress={() => router.push(`/connections/${id}?tab=following`)} style={styles.count}>
            <Text style={[styles.countNum, { color: t.ink }]}>{followingCount(db, id)}</Text>
            <Text style={[styles.countLabel, { color: t.ink3 }]}> Following</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/connections/${id}?tab=followers`)} style={styles.count}>
            <Text style={[styles.countNum, { color: t.ink }]}>{followerCount(db, id)}</Text>
            <Text style={[styles.countLabel, { color: t.ink3 }]}> Followers</Text>
          </Pressable>
          <View style={styles.count}>
            <Text style={[styles.countNum, { color: t.ink }]}>{postCount(db, id)}</Text>
            <Text style={[styles.countLabel, { color: t.ink3 }]}> Posts</Text>
          </View>
        </View>

        {acc.kind === "character" && (
          <View style={[styles.seg, { backgroundColor: t.bgSunken }]}>
            {(["posts", "replies"] as const).map((tb) => (
              <Pressable
                key={tb}
                onPress={() => setTab(tb)}
                style={[styles.segBtn, tab === tb && { backgroundColor: t.surface }]}
              >
                <Text style={[styles.segText, { color: tab === tb ? t.ink : t.ink3 }]}>
                  {tb === "posts" ? "Posts" : "Replies"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScreenHeader title={name} />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: space[7] }}
        ListEmptyComponent={
          <Text style={[styles.emptyTimeline, { color: t.ink3 }]}>
            {acc.kind === "world"
              ? "A world account — set dressing for someone else's timeline."
              : tab === "posts"
                ? `${name} hasn't posted yet.`
                : `${name} hasn't replied to anyone yet.`}
          </Text>
        }
      />
    </View>
  );
}

function SmallBtn({
  label,
  icon,
  t,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  t: ReturnType<typeof useWroomTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.smallBtn, { borderColor: t.border }]}
    >
      {icon && <Feather name={icon} size={14} color={t.ink} />}
      <Text style={[styles.smallBtnText, { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gone: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", padding: space[6] },
  banner: { height: 120, width: "100%" },
  body: { paddingHorizontal: space[4] },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: -42 },
  avatarWrap: { borderRadius: 999, borderWidth: 3 },
  actions: { flexDirection: "row", gap: space[2], alignItems: "center", paddingBottom: space[2] },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  smallBtnText: { fontSize: type.sm, fontWeight: "500" },
  followBtn: { borderRadius: radius.pill, paddingHorizontal: space[4], paddingVertical: space[2] },
  followText: { fontSize: type.sm, fontWeight: "600" },
  stepBtn: { borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[2] },
  stepText: { fontSize: type.sm, fontWeight: "600" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[2] },
  name: { fontFamily: fonts.serif, fontSize: type.xxl, fontWeight: "700" },
  handle: { fontSize: type.base },
  bio: { fontFamily: fonts.serif, fontSize: type.base, lineHeight: type.base * 1.5, marginTop: space[3] },
  flavorRow: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[3] },
  voice: { fontFamily: fonts.serif, fontSize: type.base, fontStyle: "italic", marginTop: space[3] },
  counts: { flexDirection: "row", gap: space[4], marginTop: space[4] },
  count: { flexDirection: "row", alignItems: "baseline" },
  countNum: { fontSize: type.base, fontWeight: "700", fontVariant: ["tabular-nums"] },
  countLabel: { fontSize: type.sm },
  seg: { flexDirection: "row", borderRadius: radius.md, padding: 3, gap: 3, marginTop: space[4] },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: space[2], borderRadius: radius.sm },
  segText: { fontSize: type.sm, fontWeight: "600" },
  emptyTimeline: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", padding: space[6] },
});
