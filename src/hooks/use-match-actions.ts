import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import type { MatchWithOpponent, PendingRequest } from '@/hooks/use-matches';
import {
  cancelMatch,
  cancelRequest,
  declineRequest,
  markMatchComplete,
  submitReview,
} from '@/hooks/use-matches';
import { encodeSlotId } from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import { requestReviewIfAvailable } from '@/lib/store-review';

type MatchActions = {
  reviewTarget: MatchWithOpponent | null;
  setReviewTarget: (target: MatchWithOpponent | null) => void;
  handleCancelMatch: (match: MatchWithOpponent) => void;
  handleMarkComplete: (matchId: string) => void;
  handleDecline: (requestId: string) => void;
  handleCancelRequest: (requestId: string) => void;
  handleBook: (request: PendingRequest) => void;
  handleRematch: (match: MatchWithOpponent) => void;
  handleSubmitReview: (
    matchId: string,
    rating: number,
    noShow: boolean,
  ) => Promise<void>;
  handleRefresh: () => void;
};

export const useMatchActions = (): MatchActions => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<MatchWithOpponent | null>(
    null,
  );

  const invalidate = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
  }, [queryClient]);

  const handleRefresh = useCallback((): void => {
    invalidate();
  }, [invalidate]);

  const handleCancelMatch = useCallback(
    (match: MatchWithOpponent): void => {
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
              void cancelMatch(match.id, match.myCalEventId)
                .then(invalidate)
                .catch(() =>
                  Alert.alert(
                    'Error',
                    'Could not cancel the match. Try again.',
                  ),
                );
            },
          },
        ],
      );
    },
    [invalidate],
  );

  const handleMarkComplete = useCallback(
    (matchId: string): void => {
      haptics.success();
      void markMatchComplete(matchId)
        .then(async (): Promise<void> => {
          invalidate();
          await requestReviewIfAvailable();
        })
        .catch(() =>
          Alert.alert('Error', 'Could not mark match as complete. Try again.'),
        );
    },
    [invalidate],
  );

  const handleDecline = useCallback(
    (requestId: string): void => {
      Alert.alert('Decline request?', undefined, [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: (): void => {
            haptics.medium();
            void declineRequest(requestId)
              .then(invalidate)
              .catch(() =>
                Alert.alert(
                  'Error',
                  'Could not decline the request. Try again.',
                ),
              );
          },
        },
      ]);
    },
    [invalidate],
  );

  const handleCancelRequest = useCallback(
    (requestId: string): void => {
      void cancelRequest(requestId)
        .then(invalidate)
        .catch(() =>
          Alert.alert('Error', 'Could not cancel the request. Try again.'),
        );
    },
    [invalidate],
  );

  const handleBook = useCallback(
    (request: PendingRequest): void => {
      const encodedName = encodeURIComponent(request.opponentName);
      if (request.proposedStart && request.proposedEnd) {
        const slotId = encodeSlotId(request.proposedStart, request.proposedEnd);
        router.push(
          `/match/confirm/${request.opponentId}/${slotId}?name=${encodedName}&requestId=${request.id}&requesterId=${request.opponentId}` as Parameters<
            typeof router.push
          >[0],
        );
      } else {
        router.push(
          `/match/picker/${request.opponentId}?name=${encodedName}&requestId=${request.id}` as Parameters<
            typeof router.push
          >[0],
        );
      }
    },
    [router],
  );

  const handleRematch = useCallback(
    (match: MatchWithOpponent): void => {
      router.push(
        `/match/picker/${match.opponentId}?name=${encodeURIComponent(match.opponentName)}` as Parameters<
          typeof router.push
        >[0],
      );
    },
    [router],
  );

  const handleSubmitReview = useCallback(
    async (matchId: string, rating: number, noShow: boolean): Promise<void> => {
      await submitReview(matchId, rating, noShow);
      setReviewTarget(null);
      invalidate();
    },
    [invalidate],
  );

  return {
    reviewTarget,
    setReviewTarget,
    handleCancelMatch,
    handleMarkComplete,
    handleDecline,
    handleCancelRequest,
    handleBook,
    handleRematch,
    handleSubmitReview,
    handleRefresh,
  };
};
