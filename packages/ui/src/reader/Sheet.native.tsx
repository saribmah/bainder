import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  showHandle?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Sheet({ visible, onClose, showHandle = true, children, style }: SheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, style]} onPress={() => undefined}>
          {showHandle && <View style={styles.handle} />}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,15,10,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: color.paper[50],
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    padding: 18,
    paddingBottom: 32,
    gap: 10,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.1,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -8 },
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.paper[300],
    alignSelf: "center",
    marginBottom: 4,
  },
});
