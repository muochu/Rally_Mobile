import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { useMatchActions } from '@/hooks/use-match-actions';
import type { MatchWithOpponent, PendingRequest } from '@/hooks/use-matches';
import { useMatches } from '@/hooks/use-matches';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const EMPTY_MESSAGES: Record<Tab, string> = {
  upcoming: 'No upcoming matches.\nHead to Hub to find someone to play.',
  pending: 'No pending requests.',
  past: 'No past matches yet.',
};

export default function MatchesScreen(): ReactElement {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const { data, isLoading, isFetching } = useMatches();
  const {
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
  } = useMatchActions();

  const { upcoming, pending, past } = data ?? {
    upcoming: [],
    pending: [],
    past: [],
  };

  const renderUpcoming = useCallback(
    ({ item }: { item: MatchWithOpponent }): ReactElement => (
      <Pressable
        onPress={(): void => router.push(`/match/${item.id}` as never)}
      >
        <MatchCard
          variant="upcoming"
          match={item}
          onCancel={(): void => handleCancelMatch(item)}
          onMarkComplete={(): void => handleMarkComplete(item.id)}
        />
      </Pressable>
    ),
    [handleCancelMatch, handleMarkComplete, router],
  );

  const renderPast = useCallback(
    ({ item }: { item: MatchWithOpponent }): ReactElement => {
      const canReview = item.status === 'completed' && !item.hasMyReview;
      return (
        <Pressable
          onPress={(): void => router.push(`/match/${item.id}` as never)}
        >
          <MatchCard
            variant="past"
            match={item}
            onReview={canReview ? (): void => setReviewTarget(item) : undefined}
            onRematch={(): void => handleRematch(item)}
          />
        </Pressable>
      );
    },
    [handleRematch, setReviewTarget, router],
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
              estimatedItemSize={100}
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
              estimatedItemSize={160}
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
              estimatedItemSize={100}
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

export { TabErrorFallback as ErrorBoundary } from '@/components/ui/tab-error-fallback';
