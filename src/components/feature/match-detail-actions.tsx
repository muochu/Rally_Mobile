import type { ReactElement } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { cancelMatch, markMatchComplete } from '@/hooks/use-matches';
import { haptics } from '@/lib/haptics';
import type { MatchDetail } from '@/lib/match-detail';
import { requestReviewIfAvailable } from '@/lib/store-review';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const MARK_COMPLETE_DELAY_MS = 30 * 60 * 1000;

type Props = {
  match: MatchDetail;
  matchId: string;
  onShowReview: () => void;
};

export function MatchDetailActions({
  match,
  matchId,
  onShowReview,
}: Props): ReactElement | null {
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['match', matchId] });
  };

  const isUpcoming = match.status === 'upcoming';
  const canMarkComplete =
    isUpcoming && Date.now() > match.endTime.getTime() + MARK_COMPLETE_DELAY_MS;
  const canCancel = isUpcoming && !canMarkComplete;
  const canReview = match.status === 'completed' && !match.hasMyReview;
  const canRematch =
    match.status === 'completed' || match.status === 'cancelled';

  if (!canMarkComplete && !canCancel && !canReview && !canRematch) return null;

  const handleCancel = (): void => {
    Alert.alert(
      'Cancel match?',
      `Cancel your match with ${match.opponentName} on ${match.startTime.toLocaleDateString()}? Your opponent will be notified. Your calendar event will be removed automatically, but your opponent will need to remove theirs.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel match',
          style: 'destructive',
          onPress: (): void => {
            haptics.medium();
            void cancelMatch(matchId, match.myCalEventId)
              .then(invalidate)
              .catch((): void =>
                Alert.alert('Error', 'Could not cancel the match. Try again.'),
              );
          },
        },
      ],
    );
  };

  const handleMarkComplete = (): void => {
    haptics.success();
    void markMatchComplete(matchId)
      .then(async (): Promise<void> => {
        invalidate();
        await requestReviewIfAvailable();
      })
      .catch((): void =>
        Alert.alert('Error', 'Could not mark match as complete. Try again.'),
      );
  };

  const handleRematch = (): void => {
    router.push(
      `/match/picker/${match.opponentId}?name=${encodeURIComponent(match.opponentName)}` as Parameters<
        typeof router.push
      >[0],
    );
  };

  return (
    <View style={styles.actions}>
      {canMarkComplete && (
        <Pressable
          style={styles.primaryBtn}
          onPress={handleMarkComplete}
          accessibilityRole="button"
          accessibilityLabel="Mark match as complete"
        >
          <Text style={styles.primaryBtnText}>Mark complete</Text>
        </Pressable>
      )}
      {canCancel && (
        <Pressable
          style={styles.destructiveBtn}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel match"
        >
          <Text style={styles.destructiveBtnText}>Cancel match</Text>
        </Pressable>
      )}
      {canReview && (
        <Pressable
          style={styles.primaryBtn}
          onPress={onShowReview}
          accessibilityRole="button"
          accessibilityLabel="Leave a review"
        >
          <Text style={styles.primaryBtnText}>Leave a review</Text>
        </Pressable>
      )}
      {canRematch && (
        <Pressable
          style={styles.secondaryBtn}
          onPress={handleRematch}
          accessibilityRole="button"
          accessibilityLabel="Schedule a rematch"
        >
          <Text style={styles.secondaryBtnText}>Rematch</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  destructiveBtn: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.status.error + '18',
    borderWidth: 1,
    borderColor: colors.status.error + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.status.error,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
