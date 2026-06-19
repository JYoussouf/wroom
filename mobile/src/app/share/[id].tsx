import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { useStore, getCharacter, profilePosts, buildShareHtml } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, updateCharacter, showToast } = useStore();
  const router = useRouter();
  const t = useWroomTheme();

  const c = id ? getCharacter(db, id) : null;
  const posts = useMemo(() => (c && id ? profilePosts(db, id) : []), [db, id, c]);

  if (!c) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <ScreenHeader title="Share" />
        <Text style={[styles.gone, { color: t.ink2 }]}>This character no longer exists.</Text>
      </View>
    );
  }

  async function exportHtml() {
    if (!c) return;
    try {
      const html = buildShareHtml(c, posts);
      const file = new File(Paths.cache, `${c.handle}-wroom-fiction.html`);
      if (file.exists) file.delete();
      file.create();
      file.write(html);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/html", dialogTitle: `${c.displayName} — fiction` });
      } else {
        showToast("Sharing isn't available on this device");
      }
    } catch {
      showToast("Couldn't export the page");
    }
  }

  async function copyText() {
    if (!c) return;
    const text =
      `${c.displayName} (@${c.handle}) — a fictional character\n\n` +
      posts.map((p) => p.body).join("\n\n") +
      `\n\n— Fictional content created in Writer's Room.`;
    await Clipboard.setStringAsync(text);
    showToast("Copied to clipboard ✦");
  }

  if (c.privacy !== "shareable") {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <ScreenHeader title="Share" />
        <View style={styles.lockWrap}>
          <Text style={styles.glyph}>🔒</Text>
          <Text style={[styles.lockTitle, { color: t.ink }]}>{c.displayName} is private</Text>
          <Text style={[styles.lockBody, { color: t.ink2 }]}>
            Sharing requires a conscious choice. Mark this character as shareable to create a
            read-only, clearly-watermarked view.
          </Text>
          <Pressable
            onPress={() => {
              updateCharacter(c.id, { privacy: "shareable" });
              showToast("Now shareable ✦");
            }}
            style={[styles.primary, { backgroundColor: t.accent }]}
          >
            <Feather name="globe" size={16} color={t.accentInk} />
            <Text style={[styles.primaryText, { color: t.accentInk }]}>Make shareable</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScreenHeader title="Share" />
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[7] }}>
        <Text style={[styles.intro, { color: t.ink2 }]}>
          A read-only preview of how {c.displayName} appears when shared. Clearly marked as fiction.
        </Text>

        <View style={[styles.preview, { backgroundColor: t.surface, borderColor: t.border }]}>
          {c.banner ? (
            <Image source={{ uri: c.banner }} style={[styles.banner, { backgroundColor: c.accentColor }]} />
          ) : (
            <View style={[styles.banner, { backgroundColor: c.accentColor }]} />
          )}
          <View style={styles.previewInner}>
            <View style={[styles.previewAvatar, { borderColor: t.surface }]}>
              <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={64} />
            </View>
            <View style={styles.previewNameRow}>
              <View style={styles.flex1}>
                <Text style={[styles.previewName, { color: t.ink }]}>{c.displayName}</Text>
                <Text style={[styles.handle, { color: t.ink3 }]}>@{c.handle}</Text>
              </View>
              <Text style={[styles.fictionTag, { color: t.accent }]}>✦ Fictional</Text>
            </View>
            {!!c.bio && <Text style={[styles.bio, { color: t.ink }]}>{c.bio}</Text>}
            <Text style={[styles.sectionLabel, { color: t.ink3 }]}>{posts.length} posts</Text>
            {posts.slice(0, 3).map((p) => (
              <Text key={p.id} style={[styles.previewPost, { color: t.ink, borderTopColor: t.border }]}>
                {p.body}
              </Text>
            ))}
            {posts.length > 3 && <Text style={[styles.more, { color: t.ink3 }]}>+{posts.length - 3} more in the export</Text>}
          </View>
          <View style={[styles.watermark, { backgroundColor: t.ink }]}>
            <Text style={[styles.watermarkText, { color: t.bg }]}>✦ Fictional content — created in Writer's Room</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={exportHtml} style={[styles.primary, { backgroundColor: t.accent }]}>
            <Feather name="share" size={18} color={t.accentInk} />
            <Text style={[styles.primaryText, { color: t.accentInk }]}>Export as web page (.html)</Text>
          </Pressable>
          <Pressable onPress={copyText} style={[styles.secondary, { borderColor: t.border }]}>
            <Text style={[styles.secondaryText, { color: t.ink }]}>Copy posts as text</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              updateCharacter(c.id, { privacy: "private" });
              showToast("Back to private 🔒");
              router.back();
            }}
            style={styles.ghost}
          >
            <Text style={[styles.ghostText, { color: t.ink3 }]}>Make private again</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex1: { flex: 1 },
  gone: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", padding: space[6] },
  lockWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: space[6], gap: space[3] },
  glyph: { fontSize: 36 },
  lockTitle: { fontFamily: fonts.serif, fontSize: type.xl, fontWeight: "700" },
  lockBody: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center", lineHeight: type.base * 1.5 },
  intro: { fontFamily: fonts.serif, fontSize: type.base, lineHeight: type.base * 1.5 },
  preview: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginTop: space[4] },
  banner: { height: 110, width: "100%" },
  previewInner: { padding: space[4] },
  previewAvatar: { marginTop: -42, borderRadius: 999, borderWidth: 3, alignSelf: "flex-start" },
  previewNameRow: { flexDirection: "row", alignItems: "center", marginTop: space[2] },
  previewName: { fontFamily: fonts.serif, fontSize: type.xl, fontWeight: "600" },
  handle: { fontSize: type.sm },
  fictionTag: { fontSize: type.xs, fontWeight: "700" },
  bio: { fontFamily: fonts.serif, fontSize: type.base, marginTop: space[3], lineHeight: type.base * 1.5 },
  sectionLabel: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: space[4], marginBottom: space[2] },
  previewPost: { fontFamily: fonts.serif, fontSize: type.base, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[3], marginTop: space[3], lineHeight: type.base * 1.45 },
  more: { fontSize: type.sm, marginTop: space[3] },
  watermark: { paddingVertical: space[3], alignItems: "center" },
  watermarkText: { fontSize: type.xs, fontWeight: "700" },
  actions: { gap: space[3], marginTop: space[5] },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[2], borderRadius: radius.md, paddingVertical: space[4] },
  primaryText: { fontSize: type.base, fontWeight: "600" },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingVertical: space[4], alignItems: "center" },
  secondaryText: { fontSize: type.base, fontWeight: "500" },
  ghost: { alignItems: "center", paddingVertical: space[2] },
  ghostText: { fontSize: type.sm },
});
