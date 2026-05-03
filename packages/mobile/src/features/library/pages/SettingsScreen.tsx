import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip, Icons, color } from "@bainder/ui";
import type { User } from "@bainder/sdk";
import { signOutProfile, useProfileName } from "../../profile";
import { LibraryBottomTabs } from "../components/LibraryBottomTabs";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { libraryStyles as styles } from "../library.styles";
import { useSdk } from "../../../sdk/sdk.provider";

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const reader = useProfileName();
  const { client } = useSdk();
  const { uploadDocument } = useLibraryDocuments();
  const [user, setUser] = useState<User | null>(null);
  const [citePages, setCitePages] = useState(true);
  const [personalize, setPersonalize] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.user
      .me()
      .then((res) => {
        if (!cancelled && res.data) setUser(res.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client]);

  const displayName = user?.name?.trim() || reader;
  const email = user?.email ?? "";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.wordmark}>bainder</Text>
          <View style={styles.iconButton}>
            <Icons.Close size={16} color={color.paper[800]} />
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "R"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.settingSub}>{email || "Reader profile"}</Text>
          </View>
          <Chip variant="outline">Free</Chip>
        </View>

        <Group label="Reading">
          <Row label="Theme" sub="Light · Sepia · Night" right="Light" />
          <Row label="Reading font" right="Newsreader" last />
        </Group>

        <Group label="AI">
          <Row
            label="Cite pages in answers"
            right={<Toggle checked={citePages} onPress={() => setCitePages((value) => !value)} />}
          />
          <Row
            label="Personalize from highlights"
            right={
              <Toggle checked={personalize} onPress={() => setPersonalize((value) => !value)} />
            }
            last
          />
        </Group>

        <Group label="Account">
          <Row
            label="Connected accounts"
            right={<Icons.Chevron size={14} color={color.paper[500]} />}
          />
          <Row
            label="Sign out"
            right={<Icons.Chevron size={14} color={color.paper[500]} />}
            onPress={signOutProfile}
            last
          />
        </Group>
      </ScrollView>

      <LibraryBottomTabs active="settings" bottom={insets.bottom} onUpload={uploadDocument} />
    </View>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  sub,
  right,
  last,
  onPress,
}: {
  label: string;
  sub?: string;
  right: ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      {typeof right === "string" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={styles.settingSub}>{right}</Text>
          <Icons.Chevron size={12} color={color.paper[500]} />
        </View>
      ) : (
        right
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.settingRow, last ? { borderBottomWidth: 0 } : null]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.settingRow, last ? { borderBottomWidth: 0 } : null]}>{content}</View>;
}

function Toggle({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[
        styles.toggle,
        {
          backgroundColor: checked ? color.paper[900] : color.paper[300],
          alignItems: checked ? "flex-end" : "flex-start",
        },
      ]}
    >
      <View style={styles.toggleKnob} />
    </Pressable>
  );
}
