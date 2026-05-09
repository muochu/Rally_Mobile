import { Star } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MatchWithOpponent } from '@/hooks/use-matches';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type ReviewSheetProps = {
  visible: boolean;
  match: MatchWithOpponent | null;
  onSubmit: (matchId: string, rating: number, noShow: boolean) => Promise<void>;
  onClose: () => void;
};

export const ReviewSheet = ({
  visible,
  match,
  onSubmit,
  onClose,
}: ReviewSheetProps): ReactElement => {
  const [rating, setRating] = useState(5);
  const [noShow, setNoShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!match) return;
    setSubmitting(true);
    try {
      await onSubmit(match.id, rating, noShow);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (): void => {
    setRating(5);
    setNoShow(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheetWrapper}>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.handle} />

          <Text style={styles.title}>
            How was your match with {match?.opponentName ?? 'your opponent'}?
          </Text>

          {/* Star rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={(): void => setRating(star)}
                accessibilityRole="button"
                accessibilityLabel={`${star} star${star !== 1 ? 's' : ''}`}
                style={styles.starBtn}
              >
                <Star
                  size={36}
                  color={
                    star <= rating
                      ? colors.status.warning
                      : colors.text.tertiary
                  }
                  fill={star <= rating ? colors.status.warning : 'none'}
                  strokeWidth={1.5}
                />
              </Pressable>
            ))}
          </View>

          {/* No-show toggle */}
          <Pressable
            onPress={(): void => setNoShow((v) => !v)}
            style={styles.noShowRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: noShow }}
          >
            <View style={[styles.checkbox, noShow && styles.checkboxChecked]}>
              {noShow && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.noShowLabel}>
              {match?.opponentName ?? 'They'} didn't show up
            </Text>
          </Pressable>

          {/* Actions */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              accessibilityRole="button"
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting…' : 'Submit review'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.secondary,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  starBtn: {
    padding: spacing.xs,
  },
  noShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    marginBottom: spacing.xxl,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  checkmark: {
    color: colors.text.inverse,
    fontSize: 13,
    fontWeight: '700',
  },
  noShowLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
