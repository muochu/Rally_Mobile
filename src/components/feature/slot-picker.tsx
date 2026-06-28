import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  formatDuration,
  formatSlotDate,
  formatTimeRange,
} from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import type { FreeSlot } from '@/lib/overlap';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export type DayGroup = {
  dateKey: string;
  dateLabel: string;
  slots: FreeSlot[];
};

type Props = {
  dayGroups: DayGroup[];
  totalSlots: number;
  noSlotsIn7: boolean;
  selectedSlot: FreeSlot | null;
  onSelectSlot: (slot: FreeSlot) => void;
  onExpandTo14: () => void;
};

export function SlotPicker({
  dayGroups,
  totalSlots,
  noSlotsIn7,
  selectedSlot,
  onSelectSlot,
  onExpandTo14,
}: Props): ReactElement {
  if (totalSlots === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>
          {noSlotsIn7
            ? 'No mutual times in the next 7 days'
            : 'No mutual times in the next 14 days'}
        </Text>
        <Text style={styles.emptyBody}>
          {noSlotsIn7
            ? 'Free windows are too short or non-overlapping.'
            : 'Try adjusting your preferred hours in your profile.'}
        </Text>
        {noSlotsIn7 && (
          <Pressable
            style={styles.expandButton}
            onPress={onExpandTo14}
            accessibilityRole="button"
            accessibilityLabel="Expand search to 14 days"
          >
            <Text style={styles.expandButtonText}>Try 14 days</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.slotList}>
        <Text style={styles.sectionTitle}>
          {totalSlots} time{totalSlots !== 1 ? 's' : ''} you're both free
        </Text>
        {dayGroups.map(({ dateKey, dateLabel, slots }) => (
          <View key={dateKey}>
            <Text style={styles.dayHeader}>{dateLabel}</Text>
            {slots.map((slot, i) => {
              const isSelected =
                selectedSlot?.start.getTime() === slot.start.getTime();
              return (
                <Pressable
                  key={i}
                  style={[styles.slotRow, isSelected && styles.slotRowSelected]}
                  onPress={(): void => {
                    haptics.light();
                    onSelectSlot(slot);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${dateLabel}, ${formatTimeRange(slot.start, slot.end)}`}
                >
                  <Text
                    style={[
                      styles.slotTime,
                      isSelected && styles.slotTimeSelected,
                    ]}
                  >
                    {formatTimeRange(slot.start, slot.end)}
                  </Text>
                  <Text
                    style={[
                      styles.slotDuration,
                      isSelected && styles.slotDurationSelected,
                    ]}
                  >
                    {formatDuration(slot.start, slot.end)}
                  </Text>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const buildDayGroups = (slots: FreeSlot[]): DayGroup[] => {
  const byDay = new Map<string, DayGroup>();
  for (const slot of slots) {
    const d = slot.start;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDay.has(key)) {
      byDay.set(key, { dateKey: key, dateLabel: formatSlotDate(d), slots: [] });
    }
    byDay.get(key)!.slots.push(slot);
  }
  return [...byDay.values()];
};

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  expandButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.accent.soft,
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  slotList: {
    gap: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.background.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: spacing.lg,
  },
  slotRowSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  slotTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  slotTimeSelected: {
    color: colors.accent.primary,
  },
  slotDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.tertiary,
    marginRight: spacing.md,
  },
  slotDurationSelected: {
    color: colors.accent.primary,
    opacity: 0.75,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.accent.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
  },
});
