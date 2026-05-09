import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import type { BusyInterval } from '@/lib/calendar/types';
import {
  encodeSlotId,
  formatSlotDate,
  formatTimeRange,
} from '@/lib/format-slot';
import type { FreeSlot } from '@/lib/overlap';
import { findMutualFreeSlots, sliceToMatchSlots } from '@/lib/overlap';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const LOOKAHEAD_OPTIONS = [7, 14] as const;
const MIN_MATCH_MINUTES = 90;

export default function PickerScreen(): ReactElement {
  const router = useRouter();
  const { opponentId, name } = useLocalSearchParams<{
    opponentId: string;
    name?: string;
  }>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [lookahead, setLookahead] = useState<7 | 14>(7);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);

  const opponentName = name ?? 'Player';

  const { data, isLoading, error } = useQuery({
    queryKey: ['mutual-busy', userId, opponentId],
    queryFn: async () => {
      const now = new Date();
      const end14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const [myResult, theirResult] = await Promise.all([
        supabase
          .from('availability_blocks')
          .select('start_time, end_time')
          .eq('user_id', userId!)
          .gt('end_time', now.toISOString())
          .lt('start_time', end14.toISOString()),
        supabase.rpc('get_player_availability', {
          player_id: opponentId,
          from_time: now.toISOString(),
          to_time: end14.toISOString(),
        }),
      ]);

      if (myResult.error) throw new Error(myResult.error.message);
      if (theirResult.error) throw new Error(theirResult.error.message);

      const myBusy: BusyInterval[] = (myResult.data ?? []).map((b) => ({
        start: new Date(b.start_time),
        end: new Date(b.end_time),
      }));
      const theirBusy: BusyInterval[] = (theirResult.data ?? []).map(
        (b: { start_time: string; end_time: string }) => ({
          start: new Date(b.start_time),
          end: new Date(b.end_time),
        }),
      );

      return { myBusy, theirBusy };
    },
    enabled: Boolean(userId && opponentId),
  });

  const mutualSlots = useMemo((): FreeSlot[] => {
    if (!data) return [];
    return findMutualFreeSlots(data.myBusy, data.theirBusy, {
      lookaheadDays: lookahead,
      minDurationMinutes: MIN_MATCH_MINUTES,
    });
  }, [data, lookahead]);

  type DayGroup = { dateKey: string; dateLabel: string; slots: FreeSlot[] };

  const dayGroups = useMemo((): DayGroup[] => {
    const sliced = sliceToMatchSlots(mutualSlots);
    const byDay = new Map<string, DayGroup>();
    for (const slot of sliced) {
      const d = slot.start;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!byDay.has(key)) {
        byDay.set(key, {
          dateKey: key,
          dateLabel: formatSlotDate(d),
          slots: [],
        });
      }
      byDay.get(key)!.slots.push(slot);
    }
    return [...byDay.values()];
  }, [mutualSlots]);

  const handleContinue = useCallback((): void => {
    if (!selectedSlot) return;
    const slotId = encodeSlotId(selectedSlot.start, selectedSlot.end);
    const encodedName = encodeURIComponent(opponentName);
    router.push(
      `/match/confirm/${opponentId}/${slotId}?name=${encodedName}` as Parameters<
        typeof router.push
      >[0],
    );
  }, [selectedSlot, opponentId, opponentName, router]);

  const totalSlots = dayGroups.reduce((n, g) => n + g.slots.length, 0);
  const noSlotsIn7 =
    !isLoading && !error && lookahead === 7 && totalSlots === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {opponentName}
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.toggleRow}>
        {LOOKAHEAD_OPTIONS.map((days) => (
          <Pressable
            key={days}
            style={[styles.chip, lookahead === days && styles.chipActive]}
            onPress={() => {
              setLookahead(days);
              setSelectedSlot(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={days === 7 ? 'This week' : 'Next 14 days'}
            accessibilityState={{ selected: lookahead === days }}
          >
            <Text
              style={[
                styles.chipText,
                lookahead === days && styles.chipTextActive,
              ]}
            >
              {days === 7 ? 'This week' : 'Next 14 days'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Could not load availability. Pull to retry.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {totalSlots === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {noSlotsIn7
                  ? 'No mutual times this week'
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
                  onPress={() => setLookahead(14)}
                  accessibilityRole="button"
                >
                  <Text style={styles.expandButtonText}>Try 14 days</Text>
                </Pressable>
              )}
            </View>
          ) : (
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
                        style={[
                          styles.slotRow,
                          isSelected && styles.slotRowSelected,
                        ]}
                        onPress={(): void => setSelectedSlot(slot)}
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
                          2h
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
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          fullWidth
          disabled={selectedSlot === null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  chipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyState: {
    paddingTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
});
