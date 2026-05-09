import { X } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Court, TrafficState } from '@/hooks/use-courts';
import { getTrafficState, setHomeCourt } from '@/hooks/use-courts';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  court: Court | null;
  homeCourt: string | null;
  userId: string;
  onClose: () => void;
  onHomeCourtSet: () => void;
};

const TRAFFIC_LABEL: Record<TrafficState, string> = {
  open: 'Open',
  filling: 'Filling up',
  full: 'Busy',
};

const TRAFFIC_COLOR: Record<TrafficState, string> = {
  open: colors.status.open,
  filling: colors.status.filling,
  full: colors.status.full,
};

export function CourtDetailSheet({
  court,
  homeCourt,
  userId,
  onClose,
  onHomeCourtSet,
}: Props): ReactElement {
  const [saving, setSaving] = useState(false);

  const handleSetHome = async (): Promise<void> => {
    if (!court) return;
    setSaving(true);
    try {
      await setHomeCourt(userId, court.id);
      onHomeCourtSet();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const traffic = court
    ? getTrafficState(court.upcoming_matches_count)
    : 'open';
  const isHome = court?.id === homeCourt;

  const feeLabel =
    court?.fee_per_hour_cents != null
      ? `$${(court.fee_per_hour_cents / 100).toFixed(0)}/hr`
      : 'Free';

  const surfaceLabel = court?.surface
    ? court.surface.charAt(0).toUpperCase() + court.surface.slice(1)
    : null;

  return (
    <Modal
      visible={court !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {court?.name ?? ''}
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.text.tertiary} strokeWidth={1.75} />
          </Pressable>
        </View>

        {court?.address != null && (
          <Text style={styles.address} numberOfLines={2}>
            {court.address}
          </Text>
        )}

        <View style={styles.chips}>
          <View
            style={[
              styles.chip,
              { backgroundColor: TRAFFIC_COLOR[traffic] + '22' },
            ]}
          >
            <View
              style={[styles.dot, { backgroundColor: TRAFFIC_COLOR[traffic] }]}
            />
            <Text style={[styles.chipText, { color: TRAFFIC_COLOR[traffic] }]}>
              {TRAFFIC_LABEL[traffic]}
            </Text>
          </View>

          {surfaceLabel != null && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{surfaceLabel}</Text>
            </View>
          )}

          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {court?.indoor ? 'Indoor' : 'Outdoor'}
            </Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {court?.court_count ?? 1}{' '}
              {(court?.court_count ?? 1) === 1 ? 'court' : 'courts'}
            </Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipText}>{feeLabel}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.homeBtn, isHome && styles.homeBtnActive]}
          onPress={isHome ? onClose : handleSetHome}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text
              style={[styles.homeBtnText, isHome && styles.homeBtnTextActive]}
            >
              {isHome ? 'Your home court' : 'Set as home court'}
            </Text>
          )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.secondary,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.background.secondary,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  homeBtn: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnActive: {
    backgroundColor: colors.accent.soft,
  },
  homeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  homeBtnTextActive: {
    color: colors.accent.primary,
  },
});
