import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type SavePayload = {
  full_name?: string;
  utr_rating: number | null;
  city?: string;
};

type Props = {
  visible: boolean;
  initialName: string;
  initialUtr: string;
  initialCity: string;
  onSave: (updates: SavePayload) => Promise<void>;
  onClose: () => void;
};

export function ProfileEditModal({
  visible,
  initialName,
  initialUtr,
  initialCity,
  onSave,
  onClose,
}: Props): ReactElement {
  const [editName, setEditName] = useState(initialName);
  const [editUtr, setEditUtr] = useState(initialUtr);
  const [editCity, setEditCity] = useState(initialCity);
  const [saving, setSaving] = useState(false);

  useEffect((): void => {
    if (visible) {
      setEditName(initialName);
      setEditUtr(initialUtr);
      setEditCity(initialCity);
    }
  }, [visible, initialName, initialUtr, initialCity]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const utr = parseFloat(editUtr);
      await onSave({
        full_name: editName.trim() || undefined,
        utr_rating: isNaN(utr) ? null : Math.min(16.5, Math.max(0, utr)),
        city: editCity.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Edit profile</Text>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.fieldInput}
          value={editName}
          onChangeText={setEditName}
          placeholder="Your name"
          placeholderTextColor={colors.text.tertiary}
          autoCorrect={false}
        />

        <Text style={styles.fieldLabel}>UTR Rating</Text>
        <TextInput
          style={styles.fieldInput}
          value={editUtr}
          onChangeText={setEditUtr}
          placeholder="e.g. 5.5"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>City</Text>
        <TextInput
          style={styles.fieldInput}
          value={editCity}
          onChangeText={setEditCity}
          placeholder="e.g. Vancouver"
          placeholderTextColor={colors.text.tertiary}
          autoCorrect={false}
        />

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={(): void => {
            void handleSave();
          }}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.secondary,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  fieldInput: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.lg,
  },
  saveBtn: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
