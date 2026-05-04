import { StyleSheet } from "react-native";
import { font, radius, type ThemeColors } from "@baindar/ui";

export const buildProfileStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingBottom: 20,
    },
    avatar: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: palette.surfaceRaised,
    },
    avatarText: {
      fontFamily: font.nativeFamily.display,
      fontSize: 22,
      fontWeight: "500",
      color: palette.fgSubtle,
    },
    profileName: {
      fontFamily: font.nativeFamily.display,
      fontSize: 22,
      fontWeight: "500",
      color: palette.fg,
    },
    group: {
      marginBottom: 20,
    },
    groupLabel: {
      marginBottom: 8,
      fontFamily: font.nativeFamily.ui,
      fontSize: 11,
      fontWeight: "500",
      letterSpacing: 0.44,
      color: palette.fgMuted,
      textTransform: "uppercase",
    },
    groupBody: {
      borderRadius: 14,
      backgroundColor: palette.surfaceRaised,
      paddingHorizontal: 14,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      paddingVertical: 14,
    },
    settingLabel: {
      fontFamily: font.nativeFamily.ui,
      fontSize: 13,
      fontWeight: "500",
      color: palette.fg,
    },
    settingSub: {
      marginTop: 2,
      fontFamily: font.nativeFamily.ui,
      fontSize: 11,
      color: palette.fgMuted,
    },
    toggle: {
      width: 40,
      height: 22,
      borderRadius: radius.pill,
      padding: 2,
    },
    toggleKnob: {
      width: 18,
      height: 18,
      borderRadius: radius.pill,
      backgroundColor: palette.bg,
    },
  });

export type ProfileStyles = ReturnType<typeof buildProfileStyles>;
