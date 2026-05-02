import { useState, type ReactNode } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";
import { radius } from "../tokens/radius.ts";
import { tintIcon } from "../utils/tintIcon.ts";

export type InputProps = Omit<TextInputProps, "style"> & {
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  style?: StyleProp<TextStyle>;
  wrapStyle?: StyleProp<ViewStyle>;
};

export function Input({
  iconStart,
  iconEnd,
  style,
  wrapStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const palette = useThemeColors();

  return (
    <View style={[styles.wrap, wrapStyle]}>
      {iconStart && <View style={styles.iconStart}>{tintIcon(iconStart, palette.fgMuted)}</View>}
      <TextInput
        placeholderTextColor={palette.fgMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            backgroundColor: focused ? palette.surface : palette.surfaceRaised,
            borderColor: focused ? palette.borderStrong : "transparent",
            color: palette.fg,
          },
          iconStart ? { paddingLeft: 48 } : null,
          iconEnd ? { paddingRight: 48 } : null,
          style,
        ]}
        {...rest}
      />
      {iconEnd && <View style={styles.iconEnd}>{tintIcon(iconEnd, palette.fgMuted)}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    width: "100%",
  },
  input: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: radius.pill,
    width: "100%",
  },
  iconStart: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  iconEnd: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
});
