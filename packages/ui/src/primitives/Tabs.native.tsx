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
import { color } from "../tokens/color.ts";

export type TabsProps = Omit<ViewProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Tabs({ children, style, ...rest }: TabsProps) {
  return (
    <View style={[styles.tabs, style]} {...rest}>
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
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: !!active }}
      style={[styles.tab, active && styles.tabActive, style]}
      {...rest}
    >
      {typeof children === "string" ? (
        <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
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
    borderBottomColor: color.paper[200],
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: color.paper[900],
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  labelInactive: {
    color: color.paper[500],
  },
  labelActive: {
    color: color.paper[900],
  },
});
