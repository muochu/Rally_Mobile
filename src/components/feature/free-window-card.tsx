import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DaySummary } from '@/hooks/use-free-windows';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

interface FreeWindowCardProps {
  summary: DaySummary;
}

export function FreeWindowCard({ summary }: FreeWindowCardProps): ReactElement {
  const { dayLabel, dateLabel, timeLabel } = summary;
  const isAllDay = timeLabel === 'All day';

  return (
    <View style={styles.card}>
      <Text style={styles.day}>{dayLabel}</Text>
      <Text style={styles.date}>{dateLabel}</Text>
      <View style={[styles.badge, isAllDay && styles.badgeAllDay]}>
        <Text style={[styles.badgeText, isAllDay && styles.badgeTextAllDay]}>
          {timeLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 120,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 3,
  },
  day: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.background.secondary,
  },
  badgeAllDay: {
    backgroundColor: colors.accent.soft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  badgeTextAllDay: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
});
