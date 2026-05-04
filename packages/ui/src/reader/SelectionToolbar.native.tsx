import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  Copy as CopyIcon,
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
      activeColor?: HighlightColor;
      colors?: HighlightColor[];
      onPickColor?: (color: HighlightColor) => void;
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
  const [colorTrayOpen, setColorTrayOpen] = useState(false);
  const suppressHighlightPressUntilRef = useRef(0);

  if (props.variant === "actions") {
    const {
      onCopy,
      onHighlight,
      onAsk,
      onAddNote,
      activeColor = "pink",
      colors = DEFAULT_COLORS,
      onPickColor,
      copyLabel = "Copy text",
      highlightLabel = "Highlight",
      askLabel = "Ask Bainder",
      noteLabel = "Add note",
      foregroundColor = palette.fg,
      style,
    } = props;
    const hasColorTray = onPickColor !== undefined;

    const handlePickColor = (nextColor: HighlightColor) => {
      setColorTrayOpen(false);
      onPickColor?.(nextColor);
    };

    const handleHighlightPress = () => {
      if (Date.now() < suppressHighlightPressUntilRef.current) {
        suppressHighlightPressUntilRef.current = 0;
        return;
      }
      setColorTrayOpen(false);
      onHighlight();
    };

    const handleHighlightLongPress = () => {
      if (!hasColorTray) return;
      suppressHighlightPressUntilRef.current = Date.now() + 700;
      setColorTrayOpen(true);
    };

    return (
      <View style={styles.actionStack}>
        {hasColorTray && colorTrayOpen && (
          <View
            accessibilityRole="toolbar"
            style={[
              styles.colorTray,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {colors.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Highlight ${c}`}
                accessibilityState={{ selected: c === activeColor }}
                onPress={() => handlePickColor(c)}
                style={({ pressed }) => [
                  styles.traySwatch,
                  {
                    backgroundColor: color.highlight[c],
                    borderColor: c === activeColor ? foregroundColor : "rgba(20,15,10,0.08)",
                  },
                  c === activeColor && {
                    shadowColor: foregroundColor,
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                  },
                  pressed && { opacity: 0.72 },
                ]}
              />
            ))}
          </View>
        )}
        <View
          accessibilityRole="toolbar"
          style={[
            styles.actionToolbar,
            { backgroundColor: palette.surface, borderColor: palette.border },
            style,
          ]}
        >
          <ActionButton
            label={highlightLabel}
            onPress={handleHighlightPress}
            onLongPress={hasColorTray ? handleHighlightLongPress : undefined}
            pressedBg={palette.surfaceHover}
          >
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor: color.highlight[activeColor],
                  borderColor: palette.surface,
                },
              ]}
            />
          </ActionButton>
          <ActionButton label={noteLabel} onPress={onAddNote} pressedBg={palette.surfaceHover}>
            <NoteIcon size={17} color={foregroundColor} />
          </ActionButton>
          <ActionButton label={askLabel} onPress={onAsk} pressedBg={palette.surfaceHover}>
            <SparklesIcon size={17} color={palette.accent} />
          </ActionButton>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <ActionButton label={copyLabel} onPress={onCopy} pressedBg={palette.surfaceHover}>
            <CopyIcon size={16} color={foregroundColor} />
          </ActionButton>
        </View>
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
  onLongPress,
  pressedBg,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  pressedBg: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={420}
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
  actionStack: {
    position: "relative",
    alignItems: "center",
  },
  colorTray: {
    position: "absolute",
    bottom: 62,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderWidth: 1,
    borderRadius: radius.pill,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  actionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    padding: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  traySwatch: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
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
