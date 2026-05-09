import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchCard } from '@/components/feature/match-card';
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
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Tab = 'upcoming' | 'pending' | 'past';

const TAB_LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  pending: 'Pending',
  past: 'Past',
};

export default function MatchesScreen(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [reviewTarget, setReviewTarget] = useState<MatchWithOpponent | null>(
    null,
  );

  const { data, isLoading } = useMatches();

  const invalidate = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
  }, [queryClient]);

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
      void markMatchComplete(matchId).then(invalidate);
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
      router.push(
        `/match/picker/${request.opponentId}?name=${encodeURIComponent(request.opponentName)}` as Parameters<
          typeof router.push
        >[0],
      );
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

  const listData = (): {
    upcoming: MatchWithOpponent[];
    pending: PendingRequest[];
    past: MatchWithOpponent[];
  } => data ?? { upcoming: [], pending: [], past: [] };

  const emptyMessages: Record<Tab, string> = {
    upcoming: 'No upcoming matches.\nHead to Hub to find someone to play.',
    pending: 'No pending requests.',
    past: 'No past matches yet.',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.screenTitle}>Matches</Text>

      {/* Segmented control */}
      <View style={styles.tabRow}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={(): void => setActiveTab(tab)}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {TAB_LABELS[tab]}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : (
        <>
          {activeTab === 'upcoming' && (
            <FlatList
              data={listData().upcoming}
              keyExtractor={(item): string => item.id}
              renderItem={renderUpcoming}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{emptyMessages.upcoming}</Text>
              }
            />
          )}
          {activeTab === 'pending' && (
            <FlatList
              data={listData().pending}
              keyExtractor={(item): string => item.id}
              renderItem={renderPending}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{emptyMessages.pending}</Text>
              }
            />
          )}
          {activeTab === 'past' && (
            <FlatList
              data={listData().past}
              keyExtractor={(item): string => item.id}
              renderItem={renderPast}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{emptyMessages.past}</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tabBtn: {
    marginRight: spacing.xxl,
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  tabLabelActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.hero,
    gap: spacing.md,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
    marginTop: spacing.hero,
  },
});
