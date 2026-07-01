import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
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
import type { Account } from "@wroom/shared";
import { useStore, getPost, resolveAccount, authorAccount } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/** Display name for any poster account (author main account included). */
function accName(acc: Account): string {
  return acc.kind === "character" ? acc.displayName : acc.name;
}

export default function ComposeScreen() {
  const { replyTo } = useLocalSearchParams<{ replyTo?: string }>();
  const {
    db,
    currentAuthor,
    activeCharacterId,
    myCharacters,
    createPost,
    getDraft,
    setDraft,
    clearDraft,
    flashPost,
    showToast,
  } = useStore();
  const router = useRouter();
  const t = useWroomTheme();

  const useSerif = currentAuthor?.settings.composerFont !== "sans";
  const autosave = currentAuthor?.settings.autosave ?? true;

  // The accounts an author can post as: their own main account first, then each
  // character. Posting defaults to the stepped-in character, else the main
  // account — so an author can always post as themselves.
  const posterAccounts = useMemo<Account[]>(() => {
    const list: Account[] = [];
    if (currentAuthor) list.push(authorAccount(currentAuthor));
    for (const ch of myCharacters) list.push({ ...ch, kind: "character" });
    return list;
  }, [currentAuthor, myCharacters]);

  const [posterId, setPosterId] = useState<string>(
    () => activeCharacterId ?? currentAuthor?.id ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const poster = resolveAccount(db, posterId);

  const draftKey = useMemo(
    () => (posterId ? (replyTo ? `reply:${posterId}:${replyTo}` : `compose:${posterId}`) : ""),
    [posterId, replyTo]
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

  // Continuous, per-poster draft autosave.
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

  // Switch the identity we're posting as. Drafts are per-poster, so flush the
  // current one and load the target's, and drop any in-progress thread segments
  // (they were written in the previous persona's voice).
  function switchPoster(nextId: string) {
    setPickerOpen(false);
    if (nextId === posterId) return;
    if (autosave && draftKey) {
      if (text.trim()) setDraft(draftKey, text);
      else clearDraft(draftKey);
    }
    const nextKey = replyTo ? `reply:${nextId}:${replyTo}` : `compose:${nextId}`;
    setText(getDraft(nextKey));
    setSegments([]);
    setPosterId(nextId);
  }

  if (!poster) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg }]}>
        <ScreenHeader title="Compose" close />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: t.ink2 }]}>
            Sign in to write.
          </Text>
        </View>
      </View>
    );
  }

  const isAuthor = poster.kind === "author";
  const posterName = accName(poster);
  const posterFirst = posterName.split(" ")[0];

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
    if (!canPost || !posterId) return;
    const all = [...segments];
    if (hasContent) all.push(text.trim());
    if (all.length === 0) return;

    if (replyTo) {
      const post = createPost({ characterId: posterId, body: all[0], parentPostId: replyTo });
      flashPost(post.id);
      clearDraft(draftKey);
      showToast("Reply posted ✦");
      router.back();
      return;
    }

    if (all.length === 1) {
      const post = createPost({ characterId: posterId, body: all[0] });
      flashPost(post.id);
    } else {
      const root = createPost({ characterId: posterId, body: all[0] });
      let prev = root.id;
      for (let i = 1; i < all.length; i++) {
        const child = createPost({ characterId: posterId, body: all[i], parentPostId: prev, threadId: root.id });
        prev = child.id;
      }
      flashPost(root.id);
    }
    clearDraft(draftKey);
    showToast(all.length > 1 ? "Thread posted ✦" : "Posted ✦");
    router.back();
  }

  const parentName = parentAuthor ? accName(parentAuthor) : "";

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
        {/* "Posting as" switcher — pick the identity, including the main account. */}
        <Pressable
          onPress={() => posterAccounts.length > 1 && setPickerOpen(true)}
          style={[styles.posterBar, { borderColor: t.border, backgroundColor: t.surface }]}
        >
          <Avatar name={posterName} src={poster.avatar} accent={poster.accentColor} size={32} />
          <View style={styles.flex1}>
            <Text style={[styles.posterLabel, { color: t.ink3 }]}>Posting as</Text>
            <View style={styles.posterNameRow}>
              <Text style={[styles.posterName, { color: t.ink }]} numberOfLines={1}>
                {posterName}
              </Text>
              {isAuthor && (
                <View style={[styles.mainTag, { borderColor: t.border }]}>
                  <Text style={[styles.mainTagText, { color: t.ink3 }]}>main</Text>
                </View>
              )}
            </View>
          </View>
          {posterAccounts.length > 1 && <Feather name="chevron-down" size={18} color={t.ink3} />}
        </Pressable>

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
            <Avatar name={posterName} src={poster.avatar} accent={poster.accentColor} size={42} />
            <View style={styles.flex1}>
              <View style={styles.segmentHead}>
                <Text style={[styles.handle, { color: t.ink2 }]}>@{poster.handle}</Text>
                <Pressable onPress={() => setSegments((s) => s.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <Feather name="trash-2" size={15} color={t.ink3} />
                </Pressable>
              </View>
              <Text style={[styles.segmentBody, { color: t.ink }]}>{seg}</Text>
            </View>
          </View>
        ))}

        <View style={styles.composeRow}>
          <Avatar name={posterName} src={poster.avatar} accent={poster.accentColor} size={42} />
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
                  : isAuthor
                    ? "Share something as yourself…"
                    : `Say something as ${posterFirst}…`
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
            {isAuthor
              ? "Writing as yourself — your main account"
              : `Writing as @${poster.handle}${poster.kind === "character" && poster.voiceNote ? ` — “${poster.voiceNote}”` : ""}`}
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

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.bg, borderColor: t.border }]}>
            <Text style={[styles.sheetTitle, { color: t.ink3 }]}>Post as</Text>
            {posterAccounts.map((acc) => {
              const selected = acc.id === posterId;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => switchPoster(acc.id)}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    { backgroundColor: pressed ? t.surface2 : "transparent" },
                  ]}
                >
                  <Avatar name={accName(acc)} src={acc.avatar} accent={acc.accentColor} size={40} />
                  <View style={styles.flex1}>
                    <View style={styles.posterNameRow}>
                      <Text style={[styles.sheetName, { color: t.ink }]} numberOfLines={1}>
                        {accName(acc)}
                      </Text>
                      {acc.kind === "author" && (
                        <View style={[styles.mainTag, { borderColor: t.border }]}>
                          <Text style={[styles.mainTagText, { color: t.ink3 }]}>main</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sheetHandle, { color: t.ink3 }]}>@{acc.handle}</Text>
                  </View>
                  {selected && <Feather name="check" size={18} color={t.accent} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
  posterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    marginBottom: space[4],
  },
  posterLabel: { fontSize: type.xs },
  posterNameRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  posterName: { fontFamily: fonts.serif, fontSize: type.base, fontWeight: "600", flexShrink: 1 },
  mainTag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: 1,
  },
  mainTagText: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
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
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[7],
    gap: space[1],
  },
  sheetTitle: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: space[2] },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
  },
  sheetName: { fontFamily: fonts.serif, fontSize: type.base, fontWeight: "600", flexShrink: 1 },
  sheetHandle: { fontSize: type.sm },
});
