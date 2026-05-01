import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Hairline, Input, color } from "@bainder/ui";
import { authClient } from "../src/auth/auth.client.ts";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    setBusy(true);
    setError(null);
    const res = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Failed to send code");
      return;
    }
    setPhase("otp");
  };

  const submitOtp = async () => {
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (res.error) setError(res.error.message ?? "Invalid code");
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand}>bainder</Text>
      <Text style={styles.h1}>Sign in</Text>

      {phase === "email" ? (
        <>
          <Text style={styles.lead}>We'll email you a one-time code.</Text>
          <View style={styles.field}>
            <Input
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={requestOtp}
              returnKeyType="send"
            />
          </View>
          <View style={styles.field}>
            <Button
              variant="wine"
              size="lg"
              fullWidth
              disabled={busy || !email.includes("@")}
              onPress={requestOtp}
            >
              {busy ? "Sending…" : "Email me a code"}
            </Button>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.lead}>
            Code sent to <Text style={styles.emailHi}>{email}</Text>. In dev, the code prints to the
            wrangler terminal.
          </Text>
          <View style={styles.field}>
            <Input
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              value={otp}
              onChangeText={setOtp}
              onSubmitEditing={submitOtp}
              returnKeyType="go"
              style={{ letterSpacing: 6 }}
              maxLength={8}
            />
          </View>
          <View style={styles.field}>
            <Button
              variant="wine"
              size="lg"
              fullWidth
              disabled={busy || otp.length < 4}
              onPress={submitOtp}
            >
              {busy ? "Verifying…" : "Sign in"}
            </Button>
          </View>
          <Pressable
            onPress={() => {
              setPhase("email");
              setOtp("");
              setError(null);
            }}
          >
            <Text style={styles.linkBtn}>Use a different email</Text>
          </Pressable>
        </>
      )}

      <View style={styles.divider}>
        <Hairline style={{ flex: 1 }} />
        <Text style={styles.dividerLabel}>or</Text>
        <Hairline style={{ flex: 1 }} />
      </View>

      <View style={styles.field}>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => authClient.signIn.social({ provider: "google" })}
        >
          Continue with Google
        </Button>
      </View>
      <View style={styles.field}>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => authClient.signIn.social({ provider: "apple" })}
        >
          Continue with Apple
        </Button>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  brand: {
    fontSize: 22,
    fontWeight: "500",
    color: color.paper[900],
  },
  h1: {
    marginTop: 32,
    fontSize: 36,
    fontWeight: "500",
    color: color.paper[900],
    letterSpacing: -0.5,
  },
  lead: {
    marginTop: 8,
    fontSize: 17,
    color: color.paper[700],
    lineHeight: 24,
  },
  emailHi: {
    color: color.paper[900],
    fontWeight: "500",
  },
  field: {
    marginTop: 16,
  },
  linkBtn: {
    marginTop: 20,
    fontSize: 13,
    color: color.paper[500],
    alignSelf: "center",
  },
  divider: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: color.paper[500],
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    color: color.status.error,
  },
});
