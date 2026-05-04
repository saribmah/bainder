import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Button, IconButton, Icons, Input, useThemeColors, useThemedStyles } from "@baindar/ui";
import type { Document } from "@baindar/sdk";
import { buildDashboardStyles } from "../dashboard.styles";

export function RenameDialog({
  doc,
  onCancel,
  onSave,
}: {
  doc: Document;
  onCancel: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const styles = useThemedStyles(buildDashboardStyles);
  const palette = useThemeColors();
  const [value, setValue] = useState(doc.title);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== doc.title && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rename</Text>
            <IconButton aria-label="Close" size="sm" onPress={onCancel}>
              <Icons.Close size={14} color={palette.fgSubtle} />
            </IconButton>
          </View>
          <Input value={value} onChangeText={setValue} autoFocus maxLength={200} />
          <View style={styles.modalFooter}>
            <Button variant="ghost" onPress={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSave} onPress={save}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DeleteDialog({
  doc,
  onCancel,
  onConfirm,
}: {
  doc: Document;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const styles = useThemedStyles(buildDashboardStyles);
  const palette = useThemeColors();
  const [working, setWorking] = useState(false);

  const confirm = async () => {
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete document?</Text>
            <IconButton aria-label="Close" size="sm" onPress={onCancel}>
              <Icons.Close size={14} color={palette.fgSubtle} />
            </IconButton>
          </View>
          <Text style={styles.modalBody}>
            <Text style={styles.modalStrong}>{`"${doc.title}"`}</Text>
            {" and all of its highlights will be permanently removed. This can't be undone."}
          </Text>
          <View style={styles.modalFooter}>
            <Button variant="ghost" onPress={onCancel} disabled={working}>
              Cancel
            </Button>
            <Button variant="wine" disabled={working} onPress={confirm}>
              {working ? "Deleting..." : "Delete"}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
