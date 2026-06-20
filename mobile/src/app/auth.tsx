import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useStore } from "@wroom/shared";

import { useWroomTheme, fonts, radius, space, type } from "@/theme/theme";

type Mode = "in" | "up";

export default function AuthScreen() {
  const { logIn, signUp, enterDemo } = useStore();
  const t = useWroomTheme();
  // Wordmark has no background, so pick the variant that contrasts with the
  // current theme: accent-dot black in light mode, white in dark mode.
  const wordmark =
    useColorScheme() === "light"
      ? require("../../assets/images/wroom-wordmark-black-dot-transparent.png")
      : require("../../assets/images/wroom-wordmark-white-transparent.png");
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = mode === "up" ? await signUp(name, email, password) : await logIn(email, password);
      if (!res.ok) setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space[7], paddingBottom: insets.bottom + space[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.tag, { color: t.accent }]}>✦ A home for writers</Text>
        <Image
          source={wordmark}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="wroom"
        />
        <Text style={[styles.lede, { color: t.ink2 }]}>
          Create your world, play your part
        </Text>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.segment, { backgroundColor: t.bgSunken }]}>
            {(["in", "up"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setError(null);
                }}
                style={[styles.segBtn, mode === m && { backgroundColor: t.accent }]}
              >
                <Text style={[styles.segText, { color: mode === m ? t.accentInk : t.ink2 }]}>
                  {m === "in" ? "Log in" : "Sign up"}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === "up" && (
            <Field
              label="Username"
              value={name}
              onChangeText={setName}
              placeholder="Pick a username"
              autoComplete="username"
              t={t}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            t={t}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={mode === "up" ? "Choose a password" : "Your password"}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            t={t}
          />

          {error && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: t.accent, opacity: busy ? 0.7 : pressed ? 0.85 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={t.accentInk} />
            ) : (
              <Text style={[styles.primaryText, { color: t.accentInk }]}>
                {mode === "up" ? "Create your wroom" : "Enter your wroom"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={enterDemo} disabled={busy} style={styles.ghost}>
            <Text style={[styles.ghostText, { color: t.ink2 }]}>Explore the demo wroom →</Text>
          </Pressable>
        </View>

        <Text style={[styles.fine, { color: t.ink3 }]}>
          wroom is for authoring fiction
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  t,
  ...input
}: {
  label: string;
  t: ReturnType<typeof useWroomTheme>;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.ink2 }]}>{label}</Text>
      <TextInput
        {...input}
        placeholderTextColor={t.ink3}
        style={[styles.input, { backgroundColor: t.bg, borderColor: t.border, color: t.ink }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space[4], maxWidth: 480, width: "100%", alignSelf: "center" },
  tag: { fontSize: type.sm, fontWeight: "600", marginBottom: space[3] },
  logo: { width: 200, aspectRatio: 1175 / 265, alignSelf: "flex-start", marginBottom: space[2] },
  lede: { fontFamily: fonts.serif, fontSize: type.lg, lineHeight: type.lg * 1.4, marginTop: space[2] },
  card: {
    marginTop: space[6],
    padding: space[5],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space[4],
  },
  segment: { flexDirection: "row", borderRadius: radius.md, padding: 3, gap: 3 },
  segBtn: { flex: 1, paddingVertical: space[2], borderRadius: radius.sm, alignItems: "center" },
  segText: { fontSize: type.sm, fontWeight: "600" },
  field: { gap: space[1] },
  label: { fontSize: type.sm, fontWeight: "500" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontSize: type.base,
  },
  error: { fontSize: type.sm },
  primary: { borderRadius: radius.md, paddingVertical: space[4], alignItems: "center" },
  primaryText: { fontSize: type.base, fontWeight: "600" },
  ghost: { alignItems: "center", paddingVertical: space[2] },
  ghostText: { fontSize: type.sm, fontWeight: "500" },
  fine: { fontSize: type.xs, lineHeight: type.xs * 1.6, marginTop: space[5], textAlign: "center" },
});
