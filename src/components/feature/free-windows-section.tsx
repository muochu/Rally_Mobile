import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DaySlotsPanel } from '@/components/feature/day-slots-panel';
import { toDateKey,WeekDayStrip } from '@/components/feature/week-day-strip';
import type { DaySummary } from '@/hooks/use-free-windows';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = {
  daySummaries: DaySummary[];
  isLoading: boolean;
};

function getWeekDays(offset: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset * 7 + i);
    return d;
  });
}

export function FreeWindowsSection({
  daySummaries,
  isLoading,
}: Props): ReactElement {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const summaryMap = useMemo(
    () => new Map(daySummaries.map((s) => [s.dateKey, s])),
    [daySummaries],
  );

  // Auto-select first free day in current week on load or week change
  useEffect(() => {
    if (selectedDateKey) return;
    const first = weekDays.find((d) => summaryMap.has(toDateKey(d)));
    if (first) setSelectedDateKey(toDateKey(first));
  }, [daySummaries, weekDays, summaryMap, selectedDateKey]);

  const hasNextWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + 7);
    return daySummaries.some((s) => s.date >= nextWeekStart);
  }, [daySummaries]);

  const thisWeekHasFree = useMemo(
    () => weekDays.some((d) => summaryMap.has(toDateKey(d))),
    [weekDays, summaryMap],
  );

  const selectedSummary = selectedDateKey
    ? (summaryMap.get(selectedDateKey) ?? null)
    : null;

  const handleSelectDay = useCallback((key: string): void => {
    setSelectedDateKey((prev) => (prev === key ? null : key));
  }, []);

  const handleWeekChange = useCallback((offset: 0 | 1): void => {
    setWeekOffset(offset);
    setSelectedDateKey(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Your free windows</Text>
        <View style={styles.skeletonRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={styles.skeletonBubble} />
          ))}
        </View>
      </View>
    );
  }

  if (daySummaries.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Your free windows</Text>
        <Text style={styles.emptyText}>
          No availability found in the next two weeks. Add events to your calendar and pull to refresh.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Your free windows</Text>
      <WeekDayStrip
        weekDays={weekDays}
        daySummaries={daySummaries}
        selectedDateKey={selectedDateKey}
        weekOffset={weekOffset}
        hasNextWeek={hasNextWeek}
        onSelectDay={handleSelectDay}
        onWeekChange={handleWeekChange}
      />
      {!thisWeekHasFree && weekOffset === 0 && hasNextWeek && (
        <Text style={styles.hintText}>
          No free time this week — check next week below
        </Text>
      )}
      <DaySlotsPanel summary={selectedSummary} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing.xl,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  hintText: {
    fontSize: 13,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.lg,
    fontStyle: 'italic',
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  skeletonBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
  },
});
