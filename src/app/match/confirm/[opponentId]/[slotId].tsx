import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarEventPreview } from '@/components/feature/calendar-event-preview';
import { Button } from '@/components/ui/button';
import {
  decodeSlotId,
  formatDuration,
  formatSlotDate,
  formatTimeRange,
} from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import { confirmMatch, UserFacingError } from '@/lib/match-flow';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export default function ConfirmScreen(): ReactElement {
  const router = useRouter();
  const { opponentId, slotId, name } = useLocalSearchParams<{
    opponentId: string;
    slotId: string;
    name?: string;
  }>();

  const opponentName = name ?? 'Player';
  const { start, end } = decodeSlotId(slotId);

  const [opponentUtr, setOpponentUtr] = useState<number | null>(null);
  const [calendarDeniedBanner, setCalendarDeniedBanner] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('utr_rating')
      .eq('id', opponentId)
      .single()
      .then(({ data }) => {
        if (data) setOpponentUtr(data.utr_rating);
      });
  }, [opponentId]);

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () =>
      confirmMatch({ opponentId, slotStart: start, slotEnd: end }),
    onSuccess: (result) => {
      haptics.heavy();
      if (result.calendarDenied) setCalendarDeniedBanner(true);
      const encodedName = encodeURIComponent(opponentName);
      router.replace(
        `/match/booked/${result.matchId}?slotId=${slotId}&name=${encodedName}&calDenied=${result.calendarDenied}` as Parameters<
          typeof router.replace
        >[0],
      );
    },
    onError: (err) => {
      haptics.error();
      if (err instanceof UserFacingError) {
        Alert.alert('Slot no longer available', err.message, [
          {
            text: 'Pick another time',
            onPress: (): void => {
              router.back();
            },
          },
        ]);
      }
    },
  });

  const handleConfirm = useCallback((): void => {
    mutate();
  }, [mutate]);

  const networkError = error && !(error instanceof UserFacingError);

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
        <Text style={styles.headerTitle}>Confirm match</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Match summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Calendar
              size={16}
              color={colors.text.tertiary}
              strokeWidth={1.5}
            />
            <Text style={styles.summaryValue}>{formatSlotDate(start)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>
                {formatTimeRange(start, end)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>
                {formatDuration(start, end)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Opponent</Text>
              <Text style={styles.summaryValue}>{opponentName}</Text>
            </View>
            {opponentUtr !== null && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>UTR</Text>
                <Text style={styles.summaryValue}>
                  {opponentUtr.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Calendar event preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Added to your calendar</Text>
          <CalendarEventPreview
            title="Tennis match – Rally"
            dateLabel={formatSlotDate(start)}
            timeRange={formatTimeRange(start, end)}
          />
        </View>

        {/* Calendar denied banner (only shows if write was previously denied) */}
        {calendarDeniedBanner && (
          <View style={styles.bannerWarn}>
            <Text style={styles.bannerText}>
              Calendar access denied — add this event manually.
            </Text>
          </View>
        )}

        {/* Network error with retry */}
        {networkError && (
          <View style={styles.bannerError}>
            <Text style={styles.bannerText}>
              Could not book the match. Check your connection.
            </Text>
            <Pressable
              onPress={() => {
                reset();
                mutate();
              }}
            >
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isPending ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent.primary} />
            <Text style={styles.loadingText}>Booking match…</Text>
          </View>
        ) : (
          <>
            <Button
              label="Book and add to calendar"
              onPress={handleConfirm}
              fullWidth
              disabled={isPending}
            />
            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  summaryCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  summaryItem: {
    minWidth: '40%',
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bannerWarn: {
    backgroundColor: '#FEF3C7',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerError: {
    backgroundColor: '#FEE2E2',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bannerText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.primary,
  },
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
});
