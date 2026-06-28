import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DaySummary } from '@/hooks/use-free-windows';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

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
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

type Props = {
  summary: DaySummary | null;
};

export function DaySlotsPanel({ summary }: Props): ReactElement {
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (summary) {
      height.value = withSpring(600, { damping: 22, stiffness: 260 });
      opacity.value = withTiming(1, { duration: 160 });
    } else {
      height.value = withTiming(0, { duration: 220 });
      opacity.value = withTiming(0, { duration: 140 });
    }
  }, [summary, height, opacity]);

  const panelStyle = useAnimatedStyle(() => ({
    maxHeight: height.value,
    opacity: opacity.value,
    overflow: 'hidden',
  }));

  const slots = summary?.slots ?? [];

  return (
    <Animated.View style={[styles.container, panelStyle]}>
      <View style={styles.inner}>
        <Text style={styles.dayLabel}>
          {summary?.dayLabel}
          {summary?.dayLabel !== 'Today' && summary?.dayLabel !== 'Tomorrow'
            ? ` · ${summary?.dateLabel}`
            : ''}
        </Text>

        {slots.length > 0 ? (
          slots.map((slot, i) => (
            <View key={i} style={styles.slotRow}>
              <View style={styles.slotDot} />
              <Text style={styles.slotTime}>
                {fmtTime(slot.start)} – {fmtTime(slot.end)}
              </Text>
              <Text style={styles.slotDuration}>
                {fmtDuration(slot.start, slot.end)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            No free windows on {summary?.dayLabel}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  inner: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.secondary,
    gap: spacing.sm,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
  },
  slotTime: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
  },
  slotDuration: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
});
