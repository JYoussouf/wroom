import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  useStore,
  type CardDensity,
  type ComposerFont,
  type Privacy,
  type SyncStatus,
  type ThemePref,
} from "@wroom/shared";

import { Avatar } from "@/components/Avatar";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: "Local only",
  syncing: "Syncing…",
  saved: "✓ Saved",
  error: "Sync error",
  offline: "Offline",
};

export default function SettingsScreen() {
  const {
    currentAuthor,
    myCharacters,
    updateAuthor,
    changePassword,
    changeEmail,
    syncStatus,
    updateSettings,
    exportRoom,
    importRoom,
    resetEverything,
    reseedDemo,
    deleteAccount,
    deleteCharacter,
    logOut,
    showToast,
  } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useWroomTheme();

  const [emailDraft, setEmailDraft] = useState(currentAuthor?.email ?? "");
  const [emailPw, setEmailPw] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  if (!currentAuthor) return null;
  const s = currentAuthor.settings;
  const emailChanged = emailDraft.trim().toLowerCase() !== currentAuthor.email;

  async function doChangeEmail() {
    if (busyEmail) return;
    setBusyEmail(true);
    try {
      const res = await changeEmail(emailPw, emailDraft);
      showToast(res.ok ? "Email updated" : res.error);
      if (res.ok) setEmailPw("");
    } finally {
      setBusyEmail(false);
    }
  }

  async function doChangePassword() {
    if (busyPw) return;
    setBusyPw(true);
    try {
      const res = await changePassword(curPw, newPw);
      showToast(res.ok ? "Password updated" : res.error);
      if (res.ok) { setCurPw(""); setNewPw(""); }
    } finally {
      setBusyPw(false);
    }
  }

  async function doExport() {
    try {
      const name = `wroom-export.json`;
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(exportRoom());
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Export your wroom" });
      } else {
        showToast("Sharing isn't available here");
      }
    } catch {
      showToast("Couldn't export your wroom");
    }
  }

  async function doImport() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
      if (res.canceled || !res.assets[0]) return;
      const file = new File(res.assets[0].uri);
      const text = file.textSync();
      const result = importRoom(text);
      showToast(result.ok ? "Wroom imported ✦" : result.error);
      if (result.ok) router.replace("/(tabs)/room");
    } catch {
      showToast("Couldn't read that file");
    }
  }

  function confirmReseed() {
    Alert.alert("Reload the demo wroom?", "This replaces your current wroom with the example 'Lamplight' wroom. Export first to keep your work.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reload demo", style: "destructive", onPress: () => { reseedDemo(); router.replace("/(tabs)/room"); showToast("Demo wroom loaded"); } },
    ]);
  }

  function confirmDeleteChar(id: string, name: string) {
    Alert.alert("Delete character?", `${name} and all of their posts will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteCharacter(id); showToast("Character deleted"); } },
    ]);
  }

  function confirmReset() {
    Alert.alert("Clear everything?", "Every character, post, and follow will be permanently deleted. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear everything", style: "destructive", onPress: () => { resetEverything(); router.replace("/(tabs)/room"); showToast("Your wroom is empty"); } },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert("Delete your account?", "Your account and your entire wroom will be permanently deleted. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete account", style: "destructive", onPress: deleteAccount },
    ]);
  }

  function confirmLogout() {
    Alert.alert("Log out", "You can sign back in anytime to pick up your wroom.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logOut },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[7], paddingHorizontal: space[4] }}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: t.ink }]}>Settings</Text>
        <Text style={[styles.sync, { color: syncStatus === "error" || syncStatus === "offline" ? t.danger : t.ink3 }]}>
          {SYNC_LABEL[syncStatus]}
        </Text>
      </View>

      {/* Profile */}
      <Group title="Profile" t={t}>
        <View style={styles.profileRow}>
          <Pressable
            onPress={async () => {
              const ImagePicker = await import("expo-image-picker");
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) return;
              const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
              if (!r.canceled && r.assets[0]?.base64) { updateAuthor({ avatar: `data:image/jpeg;base64,${r.assets[0].base64}` }); showToast("Avatar updated"); }
            }}
          >
            <Avatar name={currentAuthor.name} src={currentAuthor.avatar} accent={t.accent} size={60} />
          </Pressable>
          <View style={styles.flex1}>
            <Field label="Display name" t={t} value={currentAuthor.name} onChangeText={(v) => updateAuthor({ name: v })} />
          </View>
        </View>
        <Field label="Email" t={t} value={emailDraft} onChangeText={setEmailDraft} keyboardType="email-address" autoCapitalize="none" />
        {emailChanged && (
          <View style={styles.inlineForm}>
            <TextInput
              value={emailPw} onChangeText={setEmailPw} secureTextEntry placeholder="Current password" placeholderTextColor={t.ink3}
              style={[styles.input, styles.flex1, { backgroundColor: t.surface, color: t.ink, borderColor: t.border }]}
            />
            <ActionBtn label={busyEmail ? "…" : "Update"} disabled={busyEmail || !emailPw} t={t} onPress={doChangeEmail} />
          </View>
        )}
        <Text style={[styles.label, { color: t.ink2, marginTop: space[2] }]}>Change password</Text>
        <TextInput
          value={curPw} onChangeText={setCurPw} secureTextEntry placeholder="Current password" placeholderTextColor={t.ink3}
          style={[styles.input, { backgroundColor: t.surface, color: t.ink, borderColor: t.border, marginBottom: space[2] }]}
        />
        <View style={styles.inlineForm}>
          <TextInput
            value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="New password (min 8)" placeholderTextColor={t.ink3}
            style={[styles.input, styles.flex1, { backgroundColor: t.surface, color: t.ink, borderColor: t.border }]}
          />
          <ActionBtn label={busyPw ? "…" : "Update"} disabled={busyPw || newPw.length < 8 || !curPw} t={t} onPress={doChangePassword} />
        </View>
      </Group>

      {/* Appearance */}
      <Group title="Appearance" t={t}>
        <Seg label="Theme" t={t} value={s.theme} onChange={(theme: ThemePref) => updateSettings({ theme })}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
        <Text style={[styles.hint, { color: t.ink3 }]}>Theme currently follows the system setting; manual override is coming.</Text>
        <Seg label="Character card density" t={t} value={s.cardDensity} onChange={(cardDensity: CardDensity) => updateSettings({ cardDensity })}
          options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />
      </Group>

      {/* Writing */}
      <Group title="Writing" t={t}>
        <Seg label="Composer font" t={t} value={s.composerFont} onChange={(composerFont: ComposerFont) => updateSettings({ composerFont })}
          options={[{ value: "serif", label: "Serif" }, { value: "sans", label: "Sans" }]} />
        <Toggle label="Autosave drafts" t={t} value={s.autosave} onValueChange={(autosave) => updateSettings({ autosave })} />
      </Group>

      {/* Privacy */}
      <Group title="Privacy" t={t}>
        <Seg label="Default for new characters" t={t} value={s.defaultPrivacy} onChange={(defaultPrivacy: Privacy) => updateSettings({ defaultPrivacy })}
          options={[{ value: "private", label: "Private" }, { value: "shareable", label: "Shareable" }]} />
        <Toggle
          label="Keep everything private" sub="Nothing leaves this device unless you explicitly share it." t={t}
          value={s.keepEverythingPrivate} onValueChange={(keepEverythingPrivate) => updateSettings({ keepEverythingPrivate })}
        />
      </Group>

      {/* Connections */}
      <Group title="World" t={t}>
        <RowBtn label="Relationship graph" icon="share-2" t={t} onPress={() => router.push("/graph")} />
      </Group>

      {/* Data */}
      <Group title="Data" t={t}>
        <RowBtn label="Export wroom as JSON" icon="upload" t={t} onPress={doExport} />
        <RowBtn label="Import a wroom" icon="download" t={t} onPress={doImport} />
        <RowBtn label="Reload the demo wroom" icon="refresh-cw" t={t} onPress={confirmReseed} />
        {myCharacters.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: t.ink3 }]}>Delete a character</Text>
            {myCharacters.map((c) => (
              <View key={c.id} style={styles.deleteRow}>
                <View style={styles.deleteId}>
                  <Avatar name={c.displayName} src={c.avatar} accent={c.accentColor} size={32} />
                  <Text style={[styles.deleteName, { color: t.ink }]}>{c.displayName}</Text>
                </View>
                <Pressable onPress={() => confirmDeleteChar(c.id, c.displayName)} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={t.danger} />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </Group>

      {/* Danger */}
      <Group title="Danger zone" t={t} danger>
        <DangerBtn label="Clear everything & start fresh" t={t} onPress={confirmReset} />
        <DangerBtn label="Delete my account" t={t} onPress={confirmDeleteAccount} />
      </Group>

      {/* About */}
      <Group title="About" t={t}>
        <Text style={[styles.about, { color: t.ink2 }]}>
          ✦ Writer's Room is a tool for authoring fiction. Every character is invented and every post
          is make-believe — a writer's craft, never a real or affiliated account.
        </Text>
        <RowBtn label="Log out" icon="log-out" t={t} onPress={confirmLogout} />
      </Group>
    </ScrollView>
  );
}

type T = ReturnType<typeof useWroomTheme>;

function Group({ title, children, t, danger }: { title: string; children: React.ReactNode; t: T; danger?: boolean }) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: danger ? t.danger : t.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, t, ...input }: { label: string; t: T } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.ink2 }]}>{label}</Text>
      <TextInput {...input} placeholderTextColor={t.ink3} style={[styles.input, { backgroundColor: t.surface, color: t.ink, borderColor: t.border }]} />
    </View>
  );
}

function Seg<V extends string>({ label, value, options, onChange, t }: { label: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; t: T }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.ink2 }]}>{label}</Text>
      <View style={[styles.seg, { backgroundColor: t.bgSunken }]}>
        {options.map((o) => (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segBtn, value === o.value && { backgroundColor: t.surface }]}>
            <Text style={[styles.segText, { color: value === o.value ? t.ink : t.ink3 }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, sub, value, onValueChange, t }: { label: string; sub?: string; value: boolean; onValueChange: (v: boolean) => void; t: T }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex1}>
        <Text style={[styles.toggleLabel, { color: t.ink }]}>{label}</Text>
        {sub && <Text style={[styles.hint, { color: t.ink3 }]}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: t.accent }} />
    </View>
  );
}

function RowBtn({ label, icon, t, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; t: T; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.rowBtn, { borderColor: t.border, backgroundColor: pressed ? t.surface2 : t.surface }]}>
      <Feather name={icon} size={18} color={t.ink2} />
      <Text style={[styles.rowBtnText, { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

function ActionBtn({ label, disabled, t, onPress }: { label: string; disabled?: boolean; t: T; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.actionBtn, { borderColor: t.border, opacity: disabled ? 0.4 : 1 }]}>
      <Text style={[styles.actionBtnText, { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

function DangerBtn({ label, t, onPress }: { label: string; t: T; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.dangerBtn, { borderColor: t.danger, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.dangerText, { color: t.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space[4] },
  title: { fontFamily: fonts.serif, fontSize: type.xxl, fontWeight: "700" },
  sync: { fontSize: type.sm },
  group: { marginBottom: space[6], gap: space[3] },
  groupTitle: { fontFamily: fonts.serif, fontSize: type.lg, fontWeight: "700" },
  profileRow: { flexDirection: "row", alignItems: "flex-end", gap: space[3] },
  field: { gap: space[1] },
  label: { fontSize: type.sm, fontWeight: "600" },
  hint: { fontSize: type.xs },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[3], fontSize: type.base },
  inlineForm: { flexDirection: "row", gap: space[2], alignItems: "center" },
  seg: { flexDirection: "row", borderRadius: radius.md, padding: 3, gap: 3 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: space[2], borderRadius: radius.sm },
  segText: { fontSize: type.sm, fontWeight: "600" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[1] },
  toggleLabel: { fontSize: type.base, fontWeight: "500" },
  rowBtn: { flexDirection: "row", alignItems: "center", gap: space[3], borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3] },
  rowBtnText: { fontSize: type.base, fontWeight: "500" },
  actionBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3] },
  actionBtnText: { fontSize: type.sm, fontWeight: "600" },
  sectionLabel: { fontSize: type.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: space[2] },
  deleteRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space[2] },
  deleteId: { flexDirection: "row", alignItems: "center", gap: space[2] },
  deleteName: { fontFamily: fonts.serif, fontSize: type.base },
  dangerBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingVertical: space[4], alignItems: "center" },
  dangerText: { fontSize: type.base, fontWeight: "600" },
  about: { fontFamily: fonts.serif, fontSize: type.base, lineHeight: type.base * 1.5 },
});
