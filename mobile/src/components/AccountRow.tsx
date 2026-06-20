import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Account } from "@wroom/shared";
import { useStore } from "@wroom/shared";

import { Avatar } from "./Avatar";
import { Pill } from "./Pill";
import { RichText } from "./RichText";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/** A row in a followers/following/discovery list, with an optional follow toggle. */
export function AccountRow({ account, showFollow = true }: { account: Account; showFollow?: boolean }) {
  const { activeCharacterId, isFollowing, toggleFollow } = useStore();
  const router = useRouter();
  const t = useWroomTheme();

  const name = account.kind === "character" ? account.displayName : account.name;
  const isSelf = account.id === activeCharacterId;
  const following = activeCharacterId ? isFollowing(activeCharacterId, account.id) : false;

  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <Pressable style={styles.hit} onPress={() => router.push(`/profile/${account.id}`)}>
        <Avatar name={name} src={account.avatar} accent={account.accentColor} size={44} />
        <View style={styles.id}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
              {name}
            </Text>
            {account.kind === "world" && <Pill>world</Pill>}
          </View>
          <Text style={[styles.handle, { color: t.ink3 }]}>@{account.handle}</Text>
          {account.kind === "character" && !!account.bio && (
            <Text style={[styles.bio, { color: t.ink2 }]} numberOfLines={2}>
              <RichText text={account.bio} />
            </Text>
          )}
        </View>
      </Pressable>
      {showFollow && activeCharacterId && !isSelf && (
        <Pressable
          onPress={() => toggleFollow(activeCharacterId, account.id)}
          style={[
            styles.followBtn,
            following ? { borderColor: t.border, borderWidth: StyleSheet.hairlineWidth } : { backgroundColor: t.accent },
          ]}
        >
          <Text style={[styles.followText, { color: following ? t.ink : t.accentInk }]}>
            {following ? "Following" : "Follow"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hit: { flex: 1, flexDirection: "row", alignItems: "center", gap: space[3] },
  id: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  name: { fontFamily: fonts.serif, fontSize: type.base, fontWeight: "600", flexShrink: 1 },
  handle: { fontSize: type.sm },
  bio: { fontFamily: fonts.serif, fontSize: type.sm, marginTop: 2 },
  followBtn: { borderRadius: radius.pill, paddingHorizontal: space[4], paddingVertical: space[2] },
  followText: { fontSize: type.sm, fontWeight: "600" },
});
