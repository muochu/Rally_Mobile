import { Calendar } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatDuration,
  formatSlotDate,
  formatTimeRange,
} from '@/lib/format-slot';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  start: Date;
  end: Date;
  opponentName: string;
  opponentUtr: number | null;
};

export function MatchSummaryCard({
  start,
  end,
  opponentName,
  opponentUtr,
}: Props): ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Calendar size={16} color={colors.text.tertiary} strokeWidth={1.5} />
        <Text style={styles.value}>{formatSlotDate(start)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{formatTimeRange(start, end)}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{formatDuration(start, end)}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Opponent</Text>
          <Text style={styles.value}>{opponentName}</Text>
        </View>
        {opponentUtr !== null && (
          <View style={styles.item}>
            <Text style={styles.label}>UTR</Text>
            <Text style={styles.value}>{opponentUtr.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  item: {
    minWidth: '40%',
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
  },
});
