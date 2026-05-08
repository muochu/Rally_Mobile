import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FreeSlot } from '@/lib/overlap';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

interface FreeWindowCardProps {
  slot: FreeSlot;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const fmtTime = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour}${period}`
    : `${hour}:${String(m).padStart(2, '0')}${period}`;
};

const fmtDuration = (start: Date, end: Date): string => {
  const totalMins = Math.round((end.getTime() - start.getTime()) / 60_000);
  const totalHours = totalMins / 60;
  if (totalMins < 60) return `${totalMins}m`;
  if (totalHours < 24) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const days = Math.floor(totalHours / 24);
  const remH = Math.floor(totalHours % 24);
  return remH === 0 ? `${days}d` : `${days}d ${remH}h`;
};

export function FreeWindowCard({ slot }: FreeWindowCardProps): ReactElement {
  const { start, end } = slot;
  const durationMs = end.getTime() - start.getTime();
  const isMultiDay = durationMs >= ONE_DAY_MS;

  const day = DAY_NAMES[start.getDay()];
  const date = `${day}, ${MONTH_NAMES[start.getMonth()]} ${start.getDate()}`;
  const duration = fmtDuration(start, end);

  // For multi-day free windows, "4pm onward" is cleaner than "4pm – May 21 10pm"
  const timeRange = isMultiDay
    ? `${fmtTime(start)} onward`
    : `${fmtTime(start)} – ${fmtTime(end)}`;

  return (
    <View style={styles.card}>
      <Text style={styles.time}>{timeRange}</Text>
      <Text style={styles.meta}>
        {date} · {duration} free
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
});
