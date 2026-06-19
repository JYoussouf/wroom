import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useStore, ACCENT_PALETTE, randomAccent, type Privacy } from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { Pill, PrivacyBadge } from "@/components/Pill";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/** Pick an image and return it as a base64 data URL (so it travels in the room JSON). */
async function pickImage(aspect: [number, number]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.6,
    base64: true,
  });
  if (res.canceled || !res.assets[0]?.base64) return null;
  return `data:image/jpeg;base64,${res.assets[0].base64}`;
}

export function CharacterEditorForm({ editId }: { editId?: string }) {
  const { db, currentAuthor, createCharacter, updateCharacter, normalizeHandle, isHandleAvailable } =
    useStore();
  const router = useRouter();
  const t = useWroomTheme();

  const existing = editId ? db.characters.find((c) => c.id === editId) : undefined;

  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [handle, setHandle] = useState(existing?.handle ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [pronouns, setPronouns] = useState(existing?.pronouns ?? "");
  const [occupation, setOccupation] = useState(existing?.occupation ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [eraTag, setEraTag] = useState(existing?.eraTag ?? "");
  const [voiceNote, setVoiceNote] = useState(existing?.voiceNote ?? "");
  const [accent, setAccent] = useState(existing?.accentColor ?? randomAccent());
  const [avatar, setAvatar] = useState<string | undefined>(existing?.avatar);
  const [banner, setBanner] = useState<string | undefined>(existing?.banner);
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [privacy, setPrivacy] = useState<Privacy>(
    existing?.privacy ?? currentAuthor?.settings.defaultPrivacy ?? "private"
  );

  const normalized = normalizeHandle(handle);
  const handleTaken = normalized.length > 0 && !isHandleAvailable(normalized, existing?.id);
  const canSave = displayName.trim().length > 0 && normalized.length > 0 && !handleTaken;
  const previewName = displayName.trim() || "Your character";
  const flavor = useMemo(
    () => [pronouns, occupation, location, eraTag].filter(Boolean),
    [pronouns, occupation, location, eraTag]
  );

  function save() {
    if (!canSave) return;
    const tagList = tags.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    const payload = {
      displayName, handle: normalized, bio, pronouns, occupation, location, eraTag,
      voiceNote, accentColor: accent, avatar, banner, tags: tagList, privacy,
    };
    if (existing) {
      updateCharacter(existing.id, payload);
      router.back();
    } else {
      createCharacter(payload);
      router.replace("/(tabs)/room");
    }
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScreenHeader
        title={existing ? "Edit character" : "New character"}
        right={
          <Pressable onPress={save} disabled={!canSave} style={[styles.saveBtn, { backgroundColor: t.accent, opacity: canSave ? 1 : 0.4 }]}>
            <Text style={[styles.saveText, { color: t.accentInk }]}>{existing ? "Save" : "Create"}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[7], gap: space[5] }} keyboardShouldPersistTaps="handled">
        {/* Live preview */}
        <View>
          <Label t={t}>Live preview</Label>
          <View style={[styles.preview, { backgroundColor: t.surface, borderColor: t.border }]}>
            {banner ? (
              <Image source={{ uri: banner }} style={[styles.previewBanner, { backgroundColor: accent }]} />
            ) : (
              <View style={[styles.previewBanner, { backgroundColor: accent }]} />
            )}
            <View style={styles.previewInner}>
              <View style={[styles.previewAvatar, { borderColor: t.surface }]}>
                <Avatar name={previewName} src={avatar} accent={accent} size={64} />
              </View>
              <View style={styles.previewNameRow}>
                <View style={styles.flex1}>
                  <Text style={[styles.previewName, { color: t.ink }]} numberOfLines={1}>{previewName}</Text>
                  <Text style={[styles.handle, { color: t.ink3 }]}>@{normalized || "handle"}</Text>
                </View>
                <Text style={[styles.fictionTag, { color: t.accent }]}>✦ Fiction</Text>
              </View>
              {!!bio.trim() && <Text style={[styles.previewBio, { color: t.ink }]}>{bio}</Text>}
              {flavor.length > 0 && (
                <View style={styles.flavorRow}>
                  {flavor.map((f) => <Pill key={f}>{f as string}</Pill>)}
                </View>
              )}
              {!!voiceNote.trim() && <Text style={[styles.previewVoice, { color: t.accent }]}>Voice: “{voiceNote}”</Text>}
            </View>
          </View>
        </View>

        {/* Images */}
        <View style={styles.field}>
          <Label t={t}>Banner & avatar</Label>
          <Pressable
            onPress={async () => { const v = await pickImage([3, 1]); if (v) setBanner(v); }}
            style={[styles.bannerPicker, { borderColor: t.border, backgroundColor: accent }]}
          >
            {banner && <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} />}
            <Text style={styles.pickerHint}>Tap to set banner</Text>
          </Pressable>
          <View style={styles.avatarPickRow}>
            <Pressable onPress={async () => { const v = await pickImage([1, 1]); if (v) setAvatar(v); }}>
              <Avatar name={previewName} src={avatar} accent={accent} size={64} />
            </Pressable>
            <View style={styles.flex1}>
              {(avatar || banner) && (
                <Pressable onPress={() => { setAvatar(undefined); setBanner(undefined); }}>
                  <Text style={[styles.clearImages, { color: t.ink2 }]}>Clear images</Text>
                </Pressable>
              )}
              <Text style={[styles.hint, { color: t.ink3 }]}>Defaults use the accent color.</Text>
            </View>
          </View>
        </View>

        <Input t={t} label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Vera Sloane" />

        <View style={styles.field}>
          <Label t={t}>Handle</Label>
          <View style={styles.handleRow}>
            <Text style={[styles.atSign, { color: t.ink3 }]}>@</Text>
            <TextInput
              value={normalized}
              onChangeText={setHandle}
              placeholder="handle"
              placeholderTextColor={t.ink3}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.handleInput, { backgroundColor: t.surface, color: t.ink, borderColor: handleTaken ? t.danger : t.border }]}
            />
          </View>
          <Text style={[styles.hint, { color: handleTaken ? t.danger : t.ink3 }]}>
            {handleTaken ? `Another account already uses @${normalized}.` : "Unique within your room. Letters, numbers, . and _"}
          </Text>
        </View>

        <Input t={t} label="Bio" value={bio} onChangeText={setBio} placeholder="A line or two in their voice." multiline maxLength={300} />

        <View style={styles.row}>
          <Input t={t} style={styles.flex1} label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="she/her" />
          <Input t={t} style={styles.flex1} label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Investigator" />
        </View>
        <View style={styles.row}>
          <Input t={t} style={styles.flex1} label="Location" value={location} onChangeText={setLocation} placeholder="Lamplight City" />
          <Input t={t} style={styles.flex1} label="Era / world" value={eraTag} onChangeText={setEraTag} placeholder="1947 · noir" />
        </View>

        <Input t={t} label="Voice note" value={voiceNote} onChangeText={setVoiceNote} placeholder="How do they speak?" hint="Shown by the composer while writing as them." />
        <Input t={t} label="Tags" value={tags} onChangeText={setTags} placeholder="noir, detective (comma separated)" />

        {/* Accent */}
        <View style={styles.field}>
          <Label t={t}>Accent color</Label>
          <Text style={[styles.hint, { color: t.ink3 }]}>Drives the whole app when you step into them.</Text>
          <View style={styles.swatches}>
            {ACCENT_PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setAccent(c)}
                style={[styles.swatch, { backgroundColor: c }, accent === c && { borderColor: t.ink, borderWidth: 3 }]}
              />
            ))}
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.field}>
          <Label t={t}>Privacy</Label>
          <View style={styles.privacyRow}>
            {(["private", "shareable"] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPrivacy(p)}
                style={[styles.privacyBtn, { borderColor: t.border }, privacy === p && { backgroundColor: t.accent, borderColor: t.accent }]}
              >
                <Feather name={p === "private" ? "lock" : "globe"} size={15} color={privacy === p ? t.accentInk : t.ink} />
                <Text style={[styles.privacyText, { color: privacy === p ? t.accentInk : t.ink }]}>
                  {p === "private" ? "Private" : "Shareable"}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.privacyHintRow}>
            <PrivacyBadge privacy={privacy} />
            <Text style={[styles.hint, styles.flex1, { color: t.ink3 }]}>
              {privacy === "private" ? "Only you can see this character." : "Creates a read-only, watermarked view you can share."}
            </Text>
          </View>
        </View>

        <Pressable onPress={save} disabled={!canSave} style={[styles.bigSave, { backgroundColor: t.accent, opacity: canSave ? 1 : 0.4 }]}>
          <Text style={[styles.bigSaveText, { color: t.accentInk }]}>{existing ? "Save changes" : "Create character"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Label({ children, t }: { children: React.ReactNode; t: ReturnType<typeof useWroomTheme> }) {
  return <Text style={[styles.label, { color: t.ink2 }]}>{children}</Text>;
}

function Input({
  t, label, hint, style, multiline, ...input
}: {
  t: ReturnType<typeof useWroomTheme>;
  label: string;
  hint?: string;
  style?: object;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.field, style]}>
      <Label t={t}>{label}</Label>
      <TextInput
        {...input}
        multiline={multiline}
        placeholderTextColor={t.ink3}
        style={[styles.input, multiline && styles.inputMultiline, { backgroundColor: t.surface, color: t.ink, borderColor: t.border }]}
      />
      {!!hint && <Text style={[styles.hint, { color: t.ink3 }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex1: { flex: 1 },
  row: { flexDirection: "row", gap: space[3] },
  field: { gap: space[1] },
  label: { fontSize: type.sm, fontWeight: "600" },
  hint: { fontSize: type.xs },
  saveBtn: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill },
  saveText: { fontSize: type.sm, fontWeight: "600" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[3], fontSize: type.base },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  preview: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginTop: space[2] },
  previewBanner: { height: 80, width: "100%" },
  previewInner: { padding: space[3] },
  previewAvatar: { marginTop: -38, borderRadius: 999, borderWidth: 3, alignSelf: "flex-start" },
  previewNameRow: { flexDirection: "row", alignItems: "center", marginTop: space[2] },
  previewName: { fontFamily: fonts.serif, fontSize: type.lg, fontWeight: "600" },
  handle: { fontSize: type.sm },
  fictionTag: { fontSize: type.xs, fontWeight: "600" },
  previewBio: { fontFamily: fonts.serif, fontSize: type.base, marginTop: space[3], lineHeight: type.base * 1.4 },
  flavorRow: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[3] },
  previewVoice: { fontFamily: fonts.serif, fontSize: type.sm, fontStyle: "italic", marginTop: space[3] },
  bannerPicker: { height: 100, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", alignItems: "center", justifyContent: "center", marginTop: space[1] },
  pickerHint: { color: "#fff", fontSize: type.sm, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.sm, overflow: "hidden" },
  avatarPickRow: { flexDirection: "row", alignItems: "center", gap: space[3], marginTop: space[2] },
  clearImages: { fontSize: type.sm, fontWeight: "500" },
  handleRow: { justifyContent: "center" },
  atSign: { position: "absolute", left: space[3], zIndex: 1, fontWeight: "600", fontSize: type.base },
  handleInput: { paddingLeft: space[5] },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[2] },
  swatch: { width: 36, height: 36, borderRadius: 999 },
  privacyRow: { flexDirection: "row", gap: space[2], marginTop: space[1] },
  privacyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[2], borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingVertical: space[3] },
  privacyText: { fontSize: type.base, fontWeight: "600" },
  privacyHintRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[2] },
  bigSave: { borderRadius: radius.md, paddingVertical: space[4], alignItems: "center", marginTop: space[2] },
  bigSaveText: { fontSize: type.base, fontWeight: "600" },
});
