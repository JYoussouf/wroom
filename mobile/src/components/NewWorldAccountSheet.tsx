import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useStore, accentFromSeed } from "@wroom/shared";

import { Avatar } from "./Avatar";
import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

/**
 * Sketch a lightweight "world" account — name, handle, avatar — to populate a
 * believable world without building a full persona. A bottom-anchored modal.
 */
export function NewWorldAccountSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { createWorldAccount, normalizeHandle, isHandleAvailable } = useStore();
  const t = useWroomTheme();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>();

  const normalized = normalizeHandle(handle);
  const taken = normalized.length > 0 && !isHandleAvailable(normalized);
  const canCreate = name.trim().length > 0 && normalized.length > 0 && !taken;
  const accent = accentFromSeed(normalized || name || "world");

  function reset() {
    setName("");
    setHandle("");
    setAvatar(undefined);
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) setAvatar(`data:image/jpeg;base64,${res.assets[0].base64}`);
  }

  function create() {
    if (!canCreate) return;
    const w = createWorldAccount(name, normalized, avatar);
    onCreated?.(w.id);
    reset();
    onClose();
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={[styles.sheet, { backgroundColor: t.bgElevated }]} onPress={() => {}}>
            <View style={[styles.grabber, { backgroundColor: t.border }]} />
            <Text style={[styles.title, { color: t.ink }]}>New world account</Text>
            <Text style={[styles.sub, { color: t.ink3 }]}>A face in the crowd — no full persona required.</Text>

            <View style={styles.row}>
              <Pressable onPress={pickAvatar}>
                <Avatar name={name || "?"} src={avatar} accent={accent} size={56} />
              </Pressable>
              <View style={styles.flex1}>
                <Text style={[styles.label, { color: t.ink2 }]}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="The Lamplight Ledger"
                  placeholderTextColor={t.ink3}
                  style={[styles.input, { backgroundColor: t.surface, color: t.ink, borderColor: t.border }]}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: t.ink2 }]}>Handle</Text>
              <TextInput
                value={normalized}
                onChangeText={setHandle}
                placeholder="handle"
                placeholderTextColor={t.ink3}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: t.surface, color: t.ink, borderColor: taken ? t.danger : t.border }]}
              />
              {taken && <Text style={[styles.err, { color: t.danger }]}>That handle is already used in your wroom.</Text>}
            </View>

            <Pressable
              onPress={create}
              disabled={!canCreate}
              style={[styles.create, { backgroundColor: t.accent, opacity: canCreate ? 1 : 0.4 }]}
            >
              <Text style={[styles.createText, { color: t.accentInk }]}>Create world account</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space[5], paddingBottom: space[7], gap: space[3] },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: space[2] },
  title: { fontFamily: fonts.serif, fontSize: type.xl, fontWeight: "700" },
  sub: { fontSize: type.sm },
  row: { flexDirection: "row", alignItems: "flex-end", gap: space[3], marginTop: space[2] },
  flex1: { flex: 1 },
  field: { gap: space[1] },
  label: { fontSize: type.sm, fontWeight: "600" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[3], fontSize: type.base },
  err: { fontSize: type.xs },
  create: { borderRadius: radius.md, paddingVertical: space[4], alignItems: "center", marginTop: space[3] },
  createText: { fontSize: type.base, fontWeight: "600" },
});
