import { useRef, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icons, Input, Monogram, color, font, radius } from "@bainder/ui";
import { authClient } from "./auth.client.ts";

export type AuthMode = "signin" | "signup";

type Phase = "email" | "otp";

const copy = {
  signin: {
    title: "Welcome back,\nreader.",
    lead: "We'll send a one-time code to your inbox. No passwords.",
    submit: "Send sign-in code",
    switchLead: "New to Bainder?",
    switchAction: "Create account",
    switchTo: "/signup",
  },
  signup: {
    title: "Begin a quieter\nway to read.",
    lead: "Create your shelf in seconds. Upload books, highlight passages, ask questions.",
    submit: "Send sign-up code",
    switchLead: "Already have an account?",
    switchAction: "Sign in",
    switchTo: "/signin",
  },
} as const;

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const session = authClient.useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = copy[mode];

  if (session.data?.user) {
    return <Redirect href="/library" />;
  }

  const goBack = () => {
    if (phase === "otp") {
      setPhase("email");
      setOtp("");
      setError(null);
      return;
    }
    router.replace("/");
  };

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

  if (phase === "otp") {
    return (
      <OtpScreen
        email={email}
        otp={otp}
        busy={busy}
        error={error}
        onBack={goBack}
        onOtpChange={setOtp}
        onSubmit={submitOtp}
        paddingTop={insets.top + 12}
        paddingBottom={insets.bottom + 28}
      />
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton onPress={goBack} />

      <View style={styles.intro}>
        <Monogram
          size="md"
          backgroundColor={color.paper[900]}
          color={color.paper[50]}
          style={styles.monogram}
          textStyle={styles.monogramText}
        />
        <View>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.lead}>{c.lead}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <SocialButton
          provider="google"
          onPress={() => authClient.signIn.social({ provider: "google" })}
        />
        <SocialButton
          provider="apple"
          onPress={() => authClient.signIn.social({ provider: "apple" })}
        />
        <OrDivider />

        <View>
          <Text style={styles.label}>EMAIL</Text>
          <Input
            placeholder="reader@bainder.app"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={requestOtp}
            returnKeyType="send"
            wrapStyle={styles.inputWrap}
            style={styles.input}
          />
        </View>

        <Button size="lg" fullWidth disabled={busy || !email.includes("@")} onPress={requestOtp}>
          {busy ? "Sending..." : c.submit}
        </Button>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Text style={styles.switchText}>
          {c.switchLead}{" "}
          <Text style={styles.switchLink} onPress={() => router.replace(c.switchTo)}>
            {c.switchAction}
          </Text>
        </Text>
        <Text style={styles.legal}>By continuing, you agree to our Terms and Privacy.</Text>
      </View>
    </ScrollView>
  );
}

function OtpScreen({
  email,
  otp,
  busy,
  error,
  onBack,
  onOtpChange,
  onSubmit,
  paddingTop,
  paddingBottom,
}: {
  email: string;
  otp: string;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onOtpChange: (value: string) => void;
  onSubmit: () => void;
  paddingTop: number;
  paddingBottom: number;
}) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton onPress={onBack} />

      <View style={styles.otpIntro}>
        <Text style={styles.eyebrow}>STEP 02 / VERIFY</Text>
        <Text style={styles.otpTitle}>Check your{"\n"}inbox.</Text>
        <Text style={styles.otpLead}>
          We sent a 6-digit code to <Text style={styles.emailStrong}>{email}</Text>. It expires in
          10 minutes.
        </Text>
      </View>

      <OtpBoxes value={otp} onChange={onOtpChange} />

      <View style={styles.otpActions}>
        <Button size="lg" fullWidth disabled={busy || otp.length < 4} onPress={onSubmit}>
          {busy ? "Verifying..." : "Verify & continue"}
        </Button>
        <Button variant="ghost" size="md" fullWidth>
          Resend code 0:42
        </Button>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.tip}>
        <Icons.Sparkles size={16} color={color.wine[700]} />
        <Text style={styles.tipText}>Tip: paste codes directly - we'll auto-fill the boxes.</Text>
      </View>
    </ScrollView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={styles.back}
    >
      <Icons.Back size={18} color={color.paper[800]} />
    </Pressable>
  );
}

function SocialButton({
  provider,
  onPress,
}: {
  provider: "google" | "apple";
  onPress: () => void;
}) {
  const isApple = provider === "apple";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        isApple ? styles.socialButtonApple : styles.socialButtonGoogle,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.socialMark, isApple ? styles.socialMarkApple : styles.socialMarkGoogle]}>
        {isApple ? "A" : "G"}
      </Text>
      <Text style={[styles.socialLabel, isApple ? styles.socialLabelApple : null]}>
        Continue with {isApple ? "Apple" : "Google"}
      </Text>
    </Pressable>
  );
}

function OrDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerLabel}>OR</Text>
      <View style={styles.line} />
    </View>
  );
}

function OtpBoxes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<TextInputType | null>(null);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  return (
    <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Verification code"
        value={value}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
        style={styles.otpInput}
        caretHidden
      />
      {digits.map((digit, index) => {
        const active = index === Math.min(value.length, 5);
        return (
          <View key={index} style={[styles.otpBox, active ? styles.otpBoxActive : null]}>
            {digit.trim() ? (
              <Text style={styles.otpDigit}>{digit}</Text>
            ) : active ? (
              <View style={styles.otpCaret} />
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.paper[50],
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  intro: {
    marginTop: 24,
    gap: 28,
  },
  monogram: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  monogramText: {
    fontSize: 32,
    lineHeight: 32,
  },
  title: {
    fontFamily: font.nativeFamily.display,
    fontSize: 38,
    fontWeight: "400",
    lineHeight: 39,
    letterSpacing: 0,
    color: color.paper[900],
  },
  lead: {
    marginTop: 12,
    maxWidth: 300,
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    lineHeight: 22,
    color: color.paper[600],
  },
  form: {
    marginTop: 32,
    gap: 14,
  },
  socialButton: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: radius.pill,
  },
  socialButtonGoogle: {
    backgroundColor: color.paper[50],
    borderWidth: 1,
    borderColor: color.paper[300],
  },
  socialButtonApple: {
    backgroundColor: color.paper[900],
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  socialLabel: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 16,
    fontWeight: "500",
    color: color.paper[900],
  },
  socialLabelApple: {
    color: color.paper[50],
  },
  socialMark: {
    width: 18,
    textAlign: "center",
    fontFamily: font.nativeFamily.ui,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 20,
  },
  socialMarkGoogle: {
    color: "#4285F4",
  },
  socialMarkApple: {
    color: color.paper[50],
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: color.paper[200],
  },
  dividerLabel: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.44,
    color: color.paper[500],
  },
  label: {
    marginBottom: 8,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.44,
    color: color.paper[600],
  },
  inputWrap: {
    width: "100%",
  },
  input: {
    backgroundColor: color.paper[50],
    borderColor: color.paper[300],
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: 32,
  },
  switchText: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    lineHeight: 18,
    color: color.paper[500],
  },
  switchLink: {
    color: color.paper[900],
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  legal: {
    marginTop: 12,
    maxWidth: 300,
    textAlign: "center",
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    lineHeight: 18,
    color: color.paper[500],
  },
  error: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    lineHeight: 18,
    color: color.status.error,
  },
  otpIntro: {
    marginTop: 32,
  },
  eyebrow: {
    marginBottom: 10,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.44,
    color: color.paper[500],
  },
  otpTitle: {
    fontFamily: font.nativeFamily.display,
    fontSize: 36,
    fontWeight: "400",
    lineHeight: 38,
    letterSpacing: 0,
    color: color.paper[900],
  },
  otpLead: {
    marginTop: 14,
    maxWidth: 300,
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    lineHeight: 22,
    color: color.paper[600],
  },
  emailStrong: {
    color: color.paper[900],
    fontWeight: "500",
  },
  otpRow: {
    position: "relative",
    marginTop: 36,
    flexDirection: "row",
    gap: 8,
  },
  otpInput: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    opacity: 0,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: color.paper[100],
    borderWidth: 1,
    borderColor: "transparent",
  },
  otpBoxActive: {
    borderColor: color.paper[900],
  },
  otpDigit: {
    fontFamily: font.nativeFamily.display,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 32,
    color: color.paper[900],
  },
  otpCaret: {
    width: 1,
    height: 24,
    backgroundColor: color.paper[900],
  },
  otpActions: {
    marginTop: 24,
    gap: 12,
  },
  tip: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: color.paper[100],
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tipText: {
    flex: 1,
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    lineHeight: 18,
    color: color.paper[700],
  },
});
