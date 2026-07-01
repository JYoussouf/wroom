import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useStore, getPost, resolveAccount } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

export default function ComposeScreen() {
  const { replyTo } = useLocalSearchParams<{ replyTo?: string }>();
  const {
    db,
    currentAuthor,
    activeCharacter,
    createPost,
    getDraft,
    setDraft,
    clearDraft,
    flashPost,
    showToast,
  } = useStore();
  const router = useRouter();
  const t = useWroomTheme();

  const c = activeCharacter;
  const useSerif = currentAuthor?.settings.composerFont !== "sans";
  const autosave = currentAuthor?.settings.autosave ?? true;

  const draftKey = useMemo(
    () => (c ? (replyTo ? `reply:${c.id}:${replyTo}` : `compose:${c.id}`) : ""),
    [c, replyTo]
  );

  const [text, setText] = useState(() => (draftKey ? getDraft(draftKey) : ""));
  const [segments, setSegments] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  // Track the live selection in a ref; `forcedSel` momentarily takes control of
  // the cursor right after a format button wraps the selection, then releases.
  const selRef = useRef({ start: 0, end: 0 });
  const [forcedSel, setForcedSel] = useState<{ start: number; end: number } | undefined>(undefined);

  function applyFormat(before: string, after: string) {
    const { start, end } = selRef.current;
    const selected = text.slice(start, end);
    setText(text.slice(0, start) + before + selected + after + text.slice(end));
    const pos = start + before.length;
    const next = { start: pos, end: pos + selected.length };
    selRef.current = next;
    setForcedSel(next);
  }

  // Continuous, per-character draft autosave.
  useEffect(() => {
    if (!autosave || !draftKey) return;
    const id = setTimeout(() => {
      if (text.trim()) {
        setDraft(draftKey, text);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 900);
      } else {
        clearDraft(draftKey);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [text, autosave, draftKey, setDraft, clearDraft]);

  if (!c) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <ScreenHeader title="Compose" close />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: t.ink2 }]}>
            Step into a character to write in their voice.
          </Text>
        </View>
      </View>
    );
  }

  const parent = replyTo ? getPost(db, replyTo) : null;
  const parentAuthor = parent ? resolveAccount(db, parent.characterId) : null;

  const hasContent = text.trim().length > 0;
  const canPost = segments.length > 0 || hasContent;
  const isThread = segments.length > 0;

  function addToThread() {
    if (!hasContent) return;
    setSegments((s) => [...s, text.trim()]);
    setText("");
  }

  function publish() {
    if (!canPost || !c) return;
    const all = [...segments];
    if (hasContent) all.push(text.trim());
    if (all.length === 0) return;

    if (replyTo) {
      const post = createPost({ characterId: c.id, body: all[0], parentPostId: replyTo });
      flashPost(post.id);
      clearDraft(draftKey);
      showToast("Reply posted ✦");
      router.back();
      return;
    }

    if (all.length === 1) {
      const post = createPost({ characterId: c.id, body: all[0] });
      flashPost(post.id);
    } else {
      const root = createPost({ characterId: c.id, body: all[0] });
      let prev = root.id;
      for (let i = 1; i < all.length; i++) {
        const child = createPost({ characterId: c.id, body: all[i], parentPostId: prev, threadId: root.id });
        prev = child.id;
      }
      flashPost(root.id);
    }
    clearDraft(draftKey);
    showToast(all.length > 1 ? "Thread posted ✦" : "Posted ✦");
    router.back();
  }

  const parentName = parentAuthor
    ? parentAuthor.kind === "character"
      ? parentAuthor.displayName
      : parentAuthor.name
    : "";

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenHeader
        title={replyTo ? "Reply" : isThread ? "Thread" : "Compose"}
        close
        right={
          <View style={styles.headerRight}>
            {autosave && savedFlash && <Text style={[styles.saved, { color: t.ink3 }]}>Saved</Text>}
            <Pressable
              onPress={publish}
              disabled={!canPost}
              style={[styles.postBtn, { backgroundColor: t.accent, opacity: canPost ? 1 : 0.4 }]}
            >
              <Text style={[styles.postBtnText, { color: t.accentInk }]}>
                {replyTo ? "Reply" : isThread ? "Post thread" : "Post"}
              </Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={{ padding: space[4] }} keyboardShouldPersistTaps="handled">
        {parent && parentAuthor && (
          <View style={[styles.replyContext, { borderColor: t.border }]}>
            <Avatar name={parentName} src={parentAuthor.avatar} accent={parentAuthor.accentColor} size={32} />
            <View style={styles.flex1}>
              <Text style={[styles.replyName, { color: t.ink }]}>
                {parentName} <Text style={{ color: t.ink3 }}>@{parentAuthor.handle}</Text>
              </Text>
              <Text style={[styles.replyBody, { color: t.ink2 }]} numberOfLines={3}>
                {parent.body}
              </Text>
            </View>
          </View>
        )}

        {segments.map((seg, i) => (
          <View key={i} style={styles.segment}>
            <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={42} />
            <View style={styles.flex1}>
              <View style={styles.segmentHead}>
                <Text style={[styles.handle, { color: t.ink2 }]}>@{c.handle}</Text>
                <Pressable onPress={() => setSegments((s) => s.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <Feather name="trash-2" size={15} color={t.ink3} />
                </Pressable>
              </View>
              <Text style={[styles.segmentBody, { color: t.ink }]}>{seg}</Text>
            </View>
          </View>
        ))}

        <View style={styles.composeRow}>
          <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={42} />
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            selection={forcedSel}
            onSelectionChange={(e) => {
              selRef.current = e.nativeEvent.selection;
              if (forcedSel) setForcedSel(undefined);
            }}
            placeholder={
              replyTo
                ? "Write your reply…"
                : isThread
                  ? "Continue the thread…"
                  : `Say something as ${c.displayName.split(" ")[0]}…`
            }
            placeholderTextColor={t.ink3}
            style={[styles.field, useSerif && { fontFamily: fonts.serif }, { color: t.ink }]}
          />
        </View>

        <View style={styles.fmtBar}>
          <Pressable
            onPress={() => applyFormat("**", "**")}
            accessibilityLabel="Bold"
            style={({ pressed }) => [
              styles.fmtBtn,
              { borderColor: t.border, backgroundColor: pressed ? t.surface2 : "transparent" },
            ]}
          >
            <Text style={[styles.fmtGlyph, { color: t.ink, fontWeight: "800" }]}>B</Text>
          </Pressable>
          <Pressable
            onPress={() => applyFormat("*", "*")}
            accessibilityLabel="Italic"
            style={({ pressed }) => [
              styles.fmtBtn,
              { borderColor: t.border, backgroundColor: pressed ? t.surface2 : "transparent" },
            ]}
          >
            <Text style={[styles.fmtGlyph, { color: t.ink, fontStyle: "italic" }]}>I</Text>
          </Pressable>
          <Pressable
            onPress={() => applyFormat("~~", "~~")}
            accessibilityLabel="Strikethrough"
            style={({ pressed }) => [
              styles.fmtBtn,
              { borderColor: t.border, backgroundColor: pressed ? t.surface2 : "transparent" },
            ]}
          >
            <Text style={[styles.fmtGlyph, { color: t.ink, textDecorationLine: "line-through" }]}>S</Text>
          </Pressable>
          <Text style={[styles.fmtHint, { color: t.ink3 }]}>**bold** *italic* ~~strike~~ `code`</Text>
        </View>

        <View style={styles.voice}>
          <Feather name="feather" size={13} color={t.ink3} />
          <Text style={[styles.voiceText, { color: t.ink3 }]}>
            Writing as @{c.handle}
            {c.voiceNote ? ` — “${c.voiceNote}”` : ""}
          </Text>
        </View>

        {!replyTo && (
          <View style={styles.toolbar}>
            <Pressable
              onPress={addToThread}
              disabled={!hasContent}
              style={[styles.threadBtn, { borderColor: t.border, opacity: !hasContent ? 0.4 : 1 }]}
            >
              <Feather name="plus" size={16} color={t.ink2} />
              <Text style={[styles.threadBtnText, { color: t.ink2 }]}>Add to thread</Text>
            </Pressable>
            <View style={styles.flex1} />
          </View>
        )}

        <Text style={[styles.fiction, { color: t.ink3 }]}>
          Fiction — every post here is invented craft, private to you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex1: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: space[6] },
  emptyText: { fontFamily: fonts.serif, fontSize: type.base, textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: space[2] },
  saved: { fontSize: type.xs },
  postBtn: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill },
  postBtnText: { fontSize: type.sm, fontWeight: "600" },
  replyContext: {
    flexDirection: "row",
    gap: space[2],
    padding: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    marginBottom: space[4],
  },
  replyName: { fontFamily: fonts.serif, fontSize: type.sm, fontWeight: "600" },
  replyBody: { fontFamily: fonts.serif, fontSize: type.sm, marginTop: 2 },
  segment: { flexDirection: "row", gap: space[3], marginBottom: space[3] },
  segmentHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  handle: { fontSize: type.sm, fontWeight: "600" },
  segmentBody: { fontFamily: fonts.serif, fontSize: type.base, marginTop: 2, lineHeight: type.base * 1.45 },
  composeRow: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  field: { flex: 1, fontSize: type.lg, lineHeight: type.lg * 1.4, minHeight: 120, paddingTop: space[2] },
  fmtBar: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[3] },
  fmtBtn: {
    minWidth: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  fmtGlyph: { fontSize: type.base },
  fmtHint: { fontSize: type.xs, flex: 1, fontFamily: fonts.mono },
  voice: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[4] },
  voiceText: { fontSize: type.xs, flex: 1 },
  toolbar: { flexDirection: "row", alignItems: "center", marginTop: space[4] },
  threadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  threadBtnText: { fontSize: type.sm, fontWeight: "500" },
  fiction: { fontSize: type.xs, marginTop: space[5] },
});
