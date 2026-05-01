import type { ReactNode } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type InputProps = Omit<TextInputProps, "style"> & {
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  style?: StyleProp<TextStyle>;
  wrapStyle?: StyleProp<ViewStyle>;
};

export function Input({ iconStart, iconEnd, style, wrapStyle, ...rest }: InputProps) {
  return (
    <View style={[styles.wrap, wrapStyle]}>
      {iconStart && <View style={styles.iconStart}>{iconStart}</View>}
      <TextInput
        placeholderTextColor={color.paper[500]}
        style={[
          styles.input,
          iconStart ? { paddingLeft: 48 } : null,
          iconEnd ? { paddingRight: 48 } : null,
          style,
        ]}
        {...rest}
      />
      {iconEnd && <View style={styles.iconEnd}>{iconEnd}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    width: "100%",
  },
  input: {
    fontSize: 15,
    height: 48,
    paddingHorizontal: 18,
    backgroundColor: color.paper[100],
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.pill,
    color: color.paper[900],
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
