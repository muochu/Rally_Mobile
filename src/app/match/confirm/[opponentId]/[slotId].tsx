import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarEventPreview } from '@/components/feature/calendar-event-preview';
import { ConfirmFooter } from '@/components/feature/confirm-footer';
import { MatchSummaryCard } from '@/components/feature/match-summary-card';
import {
  decodeSlotId,
  formatSlotDate,
  formatTimeRange,
} from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import {
  acceptScheduleRequest,
  sendScheduleRequest,
  UserFacingError,
} from '@/lib/match-flow';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export default function ConfirmScreen(): ReactElement {
  const router = useRouter();
  const { opponentId, slotId, name, requestId, requesterId } =
    useLocalSearchParams<{
      opponentId: string;
      slotId: string;
      name?: string;
      requestId?: string;
      requesterId?: string;
    }>();

  const opponentName = name ?? 'Player';
  const { start, end } = decodeSlotId(slotId);
  const isAccepting = Boolean(requestId);

  const [opponentUtr, setOpponentUtr] = useState<number | null>(null);
  const [calendarDeniedBanner, setCalendarDeniedBanner] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  const bookedScale = useSharedValue(1);
  const bookedAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookedScale.value }],
  }));

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

  const mutationFn = (): Promise<{
    matchId?: string;
    requestId?: string;
    calendarDenied?: boolean;
  }> => {
    if (isAccepting && requestId && requesterId) {
      return acceptScheduleRequest({
        requestId,
        requesterId,
        slotStart: start,
        slotEnd: end,
      });
    }
    return sendScheduleRequest({
      recipientId: opponentId,
      proposedStart: start,
      proposedEnd: end,
    });
  };

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn,
    onSuccess: (result) => {
      haptics.heavy();
      setIsBooked(true);
      bookedScale.value = withSequence(
        withSpring(1.06, { damping: 6, stiffness: 400 }),
        withSpring(1, { damping: 14, stiffness: 300 }),
      );
      const encodedName = encodeURIComponent(opponentName);
      if (isAccepting && 'matchId' in result && result.matchId) {
        if (result.calendarDenied) setCalendarDeniedBanner(true);
        setTimeout(() => {
          router.replace(
            `/match/booked/${result.matchId}?slotId=${slotId}&name=${encodedName}&calDenied=${result.calendarDenied ?? false}` as Parameters<
              typeof router.replace
            >[0],
          );
        }, 700);
      } else {
        setTimeout(() => {
          router.replace(
            `/match/booked/requested?slotId=${slotId}&name=${encodedName}&mode=requested` as Parameters<
              typeof router.replace
            >[0],
          );
        }, 700);
      }
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
        <MatchSummaryCard
          start={start}
          end={end}
          opponentName={opponentName}
          opponentUtr={opponentUtr}
        />

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
              accessibilityRole="button"
              accessibilityLabel="Retry booking"
            >
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ConfirmFooter
        isBooked={isBooked}
        bookedAnimStyle={bookedAnimStyle}
        isPending={isPending}
        isAccepting={isAccepting}
        onConfirm={handleConfirm}
        onCancel={(): void => router.back()}
      />
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
});
