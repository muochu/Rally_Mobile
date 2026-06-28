import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { buildDayGroups, SlotPicker } from '@/components/feature/slot-picker';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import type { BusyInterval } from '@/lib/calendar/types';
import { encodeSlotId } from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import type { FreeSlot } from '@/lib/overlap';
import { findMutualFreeSlots, sliceToMatchSlots } from '@/lib/overlap';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const LOOKAHEAD_OPTIONS = [7, 14] as const;
const MIN_MATCH_MINUTES = 90;

const AvailabilityBlockSchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
});

export default function PickerScreen(): ReactElement {
  const router = useRouter();
  const { opponentId, name, requestId } = useLocalSearchParams<{
    opponentId: string;
    name?: string;
    requestId?: string;
  }>();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { profile } = useProfile(userId);
  const preferred = profile?.preferred_hours ?? null;

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
          .eq('user_id', userId ?? '')
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
      const myBlocks = z
        .array(AvailabilityBlockSchema)
        .parse(myResult.data ?? []);
      const theirBlocks = z
        .array(AvailabilityBlockSchema)
        .parse(theirResult.data ?? []);
      const myBusy: BusyInterval[] = myBlocks.map((b) => ({
        start: new Date(b.start_time),
        end: new Date(b.end_time),
      }));
      const theirBusy: BusyInterval[] = theirBlocks.map((b) => ({
        start: new Date(b.start_time),
        end: new Date(b.end_time),
      }));
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

  const dayGroups = useMemo(
    () => buildDayGroups(sliceToMatchSlots(mutualSlots, preferred)),
    [mutualSlots, preferred],
  );

  const handleContinue = useCallback((): void => {
    if (!selectedSlot) return;
    const slotId = encodeSlotId(selectedSlot.start, selectedSlot.end);
    const encodedName = encodeURIComponent(opponentName);
    const reqParam = requestId
      ? `&requestId=${requestId}&requesterId=${opponentId}`
      : '';
    router.push(
      `/match/confirm/${opponentId}/${slotId}?name=${encodedName}${reqParam}` as Parameters<
        typeof router.push
      >[0],
    );
  }, [selectedSlot, opponentId, opponentName, requestId, router]);

  const totalSlots = dayGroups.reduce((n, g) => n + g.slots.length, 0);
  const noSlotsIn7 =
    !isLoading && !error && lookahead === 7 && totalSlots === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={(): void => router.back()}
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
            onPress={(): void => {
              haptics.light();
              setLookahead(days);
              setSelectedSlot(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={days === 7 ? 'Next 7 days' : 'Next 14 days'}
            accessibilityState={{ selected: lookahead === days }}
          >
            <Text
              style={[
                styles.chipText,
                lookahead === days && styles.chipTextActive,
              ]}
            >
              {days === 7 ? 'Next 7 days' : 'Next 14 days'}
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
          <Text style={styles.errorText}>Could not load availability.</Text>
          <Pressable
            onPress={(): void => router.back()}
            style={styles.retryBtn}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <SlotPicker
          dayGroups={dayGroups}
          totalSlots={totalSlots}
          noSlotsIn7={noSlotsIn7}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onExpandTo14={(): void => setLookahead(14)}
        />
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
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
});
