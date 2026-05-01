import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Note as NoteIcon } from "../icons/icons.native.tsx";
import type { HighlightColor } from "../primitives/Highlight.native.tsx";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type SelectionToolbarProps = {
  colors?: HighlightColor[];
  onPickColor: (color: HighlightColor) => void;
  onAddNote?: () => void;
  noteLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_COLORS: HighlightColor[] = ["pink", "yellow", "green", "blue", "purple"];

export function SelectionToolbar({
  colors = DEFAULT_COLORS,
  onPickColor,
  onAddNote,
  noteLabel = "Add note",
  style,
}: SelectionToolbarProps) {
  return (
    <View accessibilityRole="toolbar" style={[styles.toolbar, style]}>
      {colors.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityLabel={`Highlight ${c}`}
          onPress={() => onPickColor(c)}
          style={({ pressed }) => [
            styles.swatch,
            { backgroundColor: color.highlight[c] },
            pressed && { opacity: 0.7 },
          ]}
        />
      ))}
      {onAddNote && (
        <>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={noteLabel}
            onPress={onAddNote}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: pressed ? color.paper[100] : "transparent" },
            ]}
          >
            <NoteIcon size={18} color={color.paper[800]} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: color.paper[50],
    borderWidth: 1,
    borderColor: color.paper[200],
    borderRadius: radius.pill,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(20,15,10,0.08)",
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: color.paper[200],
    marginHorizontal: 2,
  },
  action: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
