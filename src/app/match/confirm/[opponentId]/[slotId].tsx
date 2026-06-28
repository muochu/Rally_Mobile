import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function ConfirmScreen(): ReactElement | null {
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
  const slot = useMemo(() => decodeSlotId(slotId ?? ''), [slotId]);
  const isAccepting = Boolean(requestId);

  const [opponentUtr, setOpponentUtr] = useState<number | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

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

  useEffect(() => {
    if (!pendingNav) return;
    const timer = setTimeout(() => {
      router.replace(pendingNav as Parameters<typeof router.replace>[0]);
    }, 700);
    return (): void => clearTimeout(timer);
  }, [pendingNav, router]);

  const mutationFn = (): Promise<{
    matchId?: string;
    requestId?: string;
    calendarDenied?: boolean;
  }> => {
    if (!slot) throw new Error('Invalid slot');
    if (isAccepting && requestId && requesterId) {
      return acceptScheduleRequest({
        requestId,
        requesterId,
        slotStart: slot.start,
        slotEnd: slot.end,
      });
    }
    return sendScheduleRequest({
      recipientId: opponentId,
      proposedStart: slot.start,
      proposedEnd: slot.end,
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
        setPendingNav(
          `/match/booked/${result.matchId}?slotId=${slotId}&name=${encodedName}&calDenied=${result.calendarDenied ?? false}`,
        );
      } else {
        setPendingNav(
          `/match/booked/requested?slotId=${slotId}&name=${encodedName}&mode=requested`,
        );
      }
    },
    onError: (err) => {
      haptics.error();
      if (err instanceof UserFacingError) {
        Alert.alert('Slot no longer available', err.message, [
          {
            text: 'Pick another time',
            onPress: (): void => {
              // When accepting a proposed slot, send the acceptor to the picker
              // so they can choose a different time rather than returning to the
              // matches tab where there is no path to a new slot.
              if (isAccepting && requestId && requesterId) {
                router.replace(
                  `/match/picker/${opponentId}?name=${encodeURIComponent(opponentName)}&requestId=${requestId}&requesterId=${requesterId}` as Parameters<
                    typeof router.replace
                  >[0],
                );
              } else {
                router.back();
              }
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

  if (!slot) return null;

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
          start={slot.start}
          end={slot.end}
          opponentName={opponentName}
          opponentUtr={opponentUtr}
        />

        {/* Calendar event preview — only shown when accepting, not when sending a request */}
        {isAccepting && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your calendar event</Text>
            <CalendarEventPreview
              title="Tennis match – Rally"
              dateLabel={formatSlotDate(slot.start)}
              timeRange={formatTimeRange(slot.start, slot.end)}
            />
          </View>
        )}

        {/* Network error with retry */}
        {networkError && (
          <View style={styles.bannerError}>
            <Text style={styles.bannerText}>
              {error?.message ??
                'Could not book the match. Check your connection.'}
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
