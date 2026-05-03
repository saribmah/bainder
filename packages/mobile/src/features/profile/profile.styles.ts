import { StyleSheet } from "react-native";
import { color, font, radius } from "@bainder/ui";

export const profileStyles = StyleSheet.create({
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
    backgroundColor: color.paper[200],
  },
  avatarText: {
    fontFamily: font.nativeFamily.display,
    fontSize: 22,
    fontWeight: "500",
    color: color.paper[700],
  },
  profileName: {
    fontFamily: font.nativeFamily.display,
    fontSize: 22,
    fontWeight: "500",
    color: color.paper[900],
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
    color: color.paper[500],
    textTransform: "uppercase",
  },
  groupBody: {
    borderRadius: 14,
    backgroundColor: color.paper[100],
    paddingHorizontal: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.paper[200],
    paddingVertical: 14,
  },
  settingLabel: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 13,
    fontWeight: "500",
    color: color.paper[900],
  },
  settingSub: {
    marginTop: 2,
    fontFamily: font.nativeFamily.ui,
    fontSize: 11,
    color: color.paper[500],
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
    backgroundColor: color.paper[50],
  },
});
