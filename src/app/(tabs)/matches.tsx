import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchCard } from '@/components/feature/match-card';
import type { Tab } from '@/components/feature/matches-tab-bar';
import { MatchesTabBar } from '@/components/feature/matches-tab-bar';
import { ReviewSheet } from '@/components/feature/review-sheet';
import type { MatchWithOpponent, PendingRequest } from '@/hooks/use-matches';
import {
  cancelMatch,
  cancelRequest,
  declineRequest,
  markMatchComplete,
  submitReview,
  useMatches,
} from '@/hooks/use-matches';
import { encodeSlotId } from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import { requestReviewIfAvailable } from '@/lib/store-review';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const EMPTY_MESSAGES: Record<Tab, string> = {
  upcoming: 'No upcoming matches.\nHead to Hub to find someone to play.',
  pending: 'No pending requests.',
  past: 'No past matches yet.',
};

export default function MatchesScreen(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [reviewTarget, setReviewTarget] = useState<MatchWithOpponent | null>(
    null,
  );

  const { data, isLoading, isFetching } = useMatches();

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
        `Cancel your match with ${match.opponentName} on ${match.startTime.toLocaleDateString()}?`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Cancel match',
            style: 'destructive',
            onPress: (): void => {
              haptics.medium();
              void cancelMatch(match.id, match.myCalEventId).then(invalidate);
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
      void markMatchComplete(matchId).then(async (): Promise<void> => {
        invalidate();
        await requestReviewIfAvailable();
      });
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
            void declineRequest(requestId).then(invalidate);
          },
        },
      ]);
    },
    [invalidate],
  );

  const handleCancelRequest = useCallback(
    (requestId: string): void => {
      void cancelRequest(requestId).then(invalidate);
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

  const { upcoming, pending, past } = data ?? {
    upcoming: [],
    pending: [],
    past: [],
  };

  const renderUpcoming = useCallback(
    ({ item }: { item: MatchWithOpponent }): ReactElement => (
      <MatchCard
        variant="upcoming"
        match={item}
        onCancel={(): void => handleCancelMatch(item)}
        onMarkComplete={(): void => handleMarkComplete(item.id)}
      />
    ),
    [handleCancelMatch, handleMarkComplete],
  );

  const renderPast = useCallback(
    ({ item }: { item: MatchWithOpponent }): ReactElement => (
      <MatchCard
        variant="past"
        match={item}
        onReview={
          !item.hasMyReview && item.status === 'completed'
            ? (): void => setReviewTarget(item)
            : undefined
        }
        onRematch={(): void => handleRematch(item)}
      />
    ),
    [handleRematch],
  );

  const renderPending = useCallback(
    ({ item }: { item: PendingRequest }): ReactElement => {
      if (item.role === 'incoming') {
        return (
          <MatchCard
            variant="pending-incoming"
            request={item}
            onBook={(): void => handleBook(item)}
            onDecline={(): void => handleDecline(item.id)}
          />
        );
      }
      return (
        <MatchCard
          variant="pending-outgoing"
          request={item}
          onCancelRequest={(): void => handleCancelRequest(item.id)}
        />
      );
    },
    [handleBook, handleDecline, handleCancelRequest],
  );

  const refreshControl = (
    <RefreshControl
      refreshing={isFetching && !isLoading}
      onRefresh={handleRefresh}
      tintColor={colors.accent.primary}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.screenTitle}>Matches</Text>
      <MatchesTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : (
        <>
          {activeTab === 'upcoming' && (
            <FlashList
              data={upcoming}
              keyExtractor={(item): string => item.id}
              renderItem={renderUpcoming}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={120}
              refreshControl={refreshControl}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{EMPTY_MESSAGES.upcoming}</Text>
              }
            />
          )}
          {activeTab === 'pending' && (
            <FlashList
              data={pending}
              keyExtractor={(item): string => item.id}
              renderItem={renderPending}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={120}
              refreshControl={refreshControl}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{EMPTY_MESSAGES.pending}</Text>
              }
            />
          )}
          {activeTab === 'past' && (
            <FlashList
              data={past}
              keyExtractor={(item): string => item.id}
              renderItem={renderPast}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={120}
              refreshControl={refreshControl}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{EMPTY_MESSAGES.past}</Text>
              }
            />
          )}
        </>
      )}

      <ReviewSheet
        visible={reviewTarget !== null}
        match={reviewTarget}
        onSubmit={handleSubmitReview}
        onClose={(): void => setReviewTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.hero,
    gap: spacing.md,
    flexGrow: 1,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
    marginTop: spacing.hero,
  },
});
