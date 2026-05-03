import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  Copy as CopyIcon,
  Highlight as HighlightIcon,
  Note as NoteIcon,
  Sparkles as SparklesIcon,
} from "../icons/icons.native.tsx";
import type { HighlightColor } from "../primitives/Highlight.native.tsx";
import { useThemeColors } from "../theme/ThemeProvider.native.tsx";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type SelectionToolbarProps =
  | {
      variant?: "colors";
      colors?: HighlightColor[];
      onPickColor: (color: HighlightColor) => void;
      onAddNote?: () => void;
      noteLabel?: string;
      style?: StyleProp<ViewStyle>;
    }
  | {
      variant: "actions";
      onCopy: () => void;
      onHighlight: () => void;
      onAsk: () => void;
      onAddNote: () => void;
      copyLabel?: string;
      highlightLabel?: string;
      askLabel?: string;
      noteLabel?: string;
      foregroundColor?: string;
      style?: StyleProp<ViewStyle>;
    };

const DEFAULT_COLORS: HighlightColor[] = ["pink", "yellow", "green", "blue", "purple"];

export function SelectionToolbar(props: SelectionToolbarProps) {
  const palette = useThemeColors();

  if (props.variant === "actions") {
    const {
      onCopy,
      onHighlight,
      onAsk,
      onAddNote,
      copyLabel = "Copy text",
      highlightLabel = "Highlight",
      askLabel = "Ask Bainder",
      noteLabel = "Add note",
      foregroundColor = palette.fg,
      style,
    } = props;

    return (
      <View
        accessibilityRole="toolbar"
        style={[
          styles.actionToolbar,
          { backgroundColor: palette.surface, borderColor: palette.border },
          style,
        ]}
      >
        <ActionButton label={copyLabel} onPress={onCopy} pressedBg={palette.surfaceHover}>
          <CopyIcon size={20} color={foregroundColor} />
        </ActionButton>
        <ActionButton label={highlightLabel} onPress={onHighlight} pressedBg={palette.surfaceHover}>
          <HighlightIcon size={20} color={foregroundColor} />
        </ActionButton>
        <ActionButton label={askLabel} onPress={onAsk} pressedBg={palette.surfaceHover}>
          <SparklesIcon size={20} color={foregroundColor} />
        </ActionButton>
        <ActionButton label={noteLabel} onPress={onAddNote} pressedBg={palette.surfaceHover}>
          <NoteIcon size={20} color={foregroundColor} />
        </ActionButton>
      </View>
    );
  }

  const { colors = DEFAULT_COLORS, onPickColor, onAddNote, noteLabel = "Add note", style } = props;

  return (
    <View
      accessibilityRole="toolbar"
      style={[
        styles.toolbar,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
    >
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
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={noteLabel}
            onPress={onAddNote}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: pressed ? palette.surfaceHover : "transparent" },
            ]}
          >
            <NoteIcon size={18} color={palette.fg} />
          </Pressable>
        </>
      )}
    </View>
  );
}

function ActionButton({
  children,
  label,
  onPress,
  pressedBg,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  pressedBg: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: pressed ? pressedBg : "transparent" },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
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
