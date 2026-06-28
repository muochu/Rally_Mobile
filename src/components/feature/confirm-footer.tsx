import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  isBooked: boolean;
  bookedAnimStyle: StyleProp<AnimatedStyle<ViewStyle>>;
  isPending: boolean;
  isAccepting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmFooter({
  isBooked,
  bookedAnimStyle,
  isPending,
  isAccepting,
  onConfirm,
  onCancel,
}: Props): ReactElement {
  if (isBooked) {
    return (
      <View style={styles.footer}>
        <Animated.View style={[styles.successBtn, bookedAnimStyle]}>
          <Text style={styles.successBtnText}>
            {isAccepting ? 'Accepted!' : 'Sent!'}
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={styles.footer}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent.primary} />
          <Text style={styles.loadingText}>
            {isAccepting ? 'Booking match…' : 'Sending request…'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.footer}>
      <Button
        label={isAccepting ? 'Accept and book' : 'Send match request'}
        onPress={onConfirm}
        fullWidth
        disabled={isPending}
      />
      <Pressable
        style={styles.cancelButton}
        onPress={onCancel}
        accessibilityRole="button"
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    gap: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  successBtn: {
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.status.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
