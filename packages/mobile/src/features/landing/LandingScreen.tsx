import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icons, Wordmark, color, font, radius } from "@bainder/ui";

export function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goToSignIn = () => router.push("/signin");
  const goToSignUp = () => router.push("/signup");

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 22 },
      ]}
    >
      <View style={styles.nav}>
        <Wordmark size="sm" />
        <Pressable accessibilityRole="button" onPress={goToSignIn} hitSlop={12}>
          <Text style={styles.signIn}>Sign in</Text>
        </Pressable>
      </View>

      <View style={styles.heroText}>
        <Text style={styles.eyebrow}>READING · COMPANION</Text>
        <Text style={styles.title}>
          A quieter way{"\n"}
          to read anything.
        </Text>
        <Text style={styles.lead}>
          Books, PDFs, articles. Drop them in and read with an attentive AI that's actually read the
          whole thing.
        </Text>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>The Psychopathology of Everyday Things</Text>
        <Text style={styles.previewText}>
          <Text style={styles.highlight}>
            Affordances define what actions are possible. Signifiers specify how people discover
            those possibilities.
          </Text>
        </Text>

        <View style={styles.answer}>
          <View style={styles.answerHeader}>
            <Icons.Sparkles size={12} color={color.wine[700]} />
            <Text style={styles.answerLabel}>Bainder</Text>
          </View>
          <Text style={styles.answerBody}>
            An <Text style={styles.em}>affordance</Text> is what's possible. A{" "}
            <Text style={styles.em}>signifier</Text> is the cue that tells you so.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button size="md" fullWidth onPress={goToSignUp}>
          Get started · free
        </Button>
        <Button variant="ghost" size="sm" fullWidth onPress={goToSignIn}>
          I already have an account
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.paper[50],
  },
  content: {
    paddingHorizontal: 22,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  signIn: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    fontWeight: "500",
    color: color.paper[800],
  },
  heroText: {
    marginTop: 22,
  },
  eyebrow: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
    letterSpacing: 0.44,
    color: color.paper[500],
  },
  title: {
    marginTop: 12,
    fontFamily: font.nativeFamily.display,
    fontSize: 36,
    fontWeight: "400",
    lineHeight: 36,
    color: color.paper[900],
  },
  lead: {
    marginTop: 12,
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    lineHeight: 19,
    color: color.paper[700],
  },
  preview: {
    marginTop: 14,
    minHeight: 188,
    overflow: "hidden",
    borderRadius: radius.xl,
    backgroundColor: color.paper[100],
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  previewTitle: {
    alignSelf: "center",
    maxWidth: 280,
    textAlign: "center",
    fontFamily: font.nativeFamily.display,
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 22,
    color: color.paper[900],
  },
  previewText: {
    marginTop: 14,
    fontFamily: font.nativeFamily.reading,
    fontSize: 14,
    lineHeight: 22,
    color: color.paper[800],
  },
  highlight: {
    backgroundColor: color.highlight.pink,
  },
  answer: {
    marginTop: 14,
    borderRadius: radius.lg,
    backgroundColor: color.paper[50],
    padding: 12,
    shadowColor: color.paper[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  answerLabel: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    fontWeight: "500",
    color: color.wine[700],
  },
  answerBody: {
    marginTop: 4,
    fontFamily: font.nativeFamily.reading,
    fontSize: 11,
    lineHeight: 16,
    color: color.paper[800],
  },
  em: {
    fontStyle: "italic",
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
});
