import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "../theme/index.native.ts";
import { font } from "../tokens/font.ts";

export type TabsProps = Omit<ViewProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Tabs({ children, style, ...rest }: TabsProps) {
  const palette = useThemeColors();

  return (
    <View style={[styles.tabs, { borderBottomColor: palette.border }, style]} {...rest}>
      {children}
    </View>
  );
}

export type TabProps = Omit<PressableProps, "children" | "style"> & {
  active?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Tab({ active, children, style, ...rest }: TabProps) {
  const palette = useThemeColors();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: !!active }}
      style={[styles.tab, { borderBottomColor: active ? palette.action : "transparent" }, style]}
      {...rest}
    >
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: active ? palette.fg : palette.fgMuted }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 28,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  label: {
    fontFamily: font.nativeFamily.ui,
    fontSize: 15,
    fontWeight: "500",
  },
});
