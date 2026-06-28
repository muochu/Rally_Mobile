import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MatchDetailActions } from '@/components/feature/match-detail-actions';
import { ReviewSheet } from '@/components/feature/review-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { MatchWithOpponent } from '@/hooks/use-matches';
import { submitReview } from '@/hooks/use-matches';
import type { MatchDetail } from '@/lib/match-detail';
import { fetchMatchDetail } from '@/lib/match-detail';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const STATUS_LABEL: Record<MatchDetail['status'], string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<MatchDetail['status'], string> = {
  upcoming: colors.accent.primary,
  completed: colors.status.open,
  cancelled: colors.status.error,
};

export default function MatchDetailsScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showReview, setShowReview] = useState(false);

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => fetchMatchDetail(id ?? ''),
    enabled: !!id,
  });

  const handleDirections = (): void => {
    if (!match?.courtLat || !match?.courtLng) return;
    void Linking.openURL(
      `https://maps.apple.com/?daddr=${match.courtLat},${match.courtLng}&dirflg=d`,
    );
  };

  const handleSubmitReview = async (
    matchId: string,
    rating: number,
    noShow: boolean,
  ): Promise<void> => {
    await submitReview(matchId, rating, noShow);
    setShowReview(false);
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['match', id] });
  };

  const reviewTarget: MatchWithOpponent | null = match
    ? {
        id: match.id,
        opponentId: match.opponentId,
        opponentName: match.opponentName,
        opponentAvatarUrl: null,
        startTime: match.startTime,
        endTime: match.endTime,
        status: match.status,
        myCalEventId: match.myCalEventId,
        calEventColumn: match.calEventColumn,
        hasMyReview: match.hasMyReview,
        scheduleRequestId: null,
      }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.headerTitle}>Match</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContent}>
          <Skeleton width={90} height={26} borderRadius={radii.full} />
          <Skeleton height={80} style={{ marginTop: spacing.md }} />
          <Skeleton height={96} style={{ marginTop: spacing.md }} />
          <Skeleton height={80} style={{ marginTop: spacing.md }} />
        </View>
      ) : !match ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Match not found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLOR[match.status] + '22' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[match.status] },
              ]}
            />
            <Text
              style={[styles.statusText, { color: STATUS_COLOR[match.status] }]}
            >
              {STATUS_LABEL[match.status]}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Opponent</Text>
            <Text style={styles.value}>{match.opponentName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>When</Text>
            <Text style={styles.value}>
              {match.startTime.toLocaleDateString('en-CA', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.subValue}>
              {match.startTime.toLocaleTimeString('en-CA', {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              –{' '}
              {match.endTime.toLocaleTimeString('en-CA', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {match.courtName && (
            <View style={styles.card}>
              <Text style={styles.label}>Court</Text>
              <Text style={styles.value}>{match.courtName}</Text>
              {match.courtAddress && (
                <Text style={styles.subValue}>{match.courtAddress}</Text>
              )}
              {match.courtLat && (
                <Pressable
                  style={styles.directionsRow}
                  onPress={handleDirections}
                  accessibilityRole="button"
                  accessibilityLabel="Get directions to court"
                >
                  <MapPin
                    size={14}
                    color={colors.accent.primary}
                    strokeWidth={1.75}
                  />
                  <Text style={styles.directionsText}>Get directions</Text>
                </Pressable>
              )}
            </View>
          )}

          <MatchDetailActions
            match={match}
            matchId={id ?? ''}
            onShowReview={(): void => setShowReview(true)}
          />
        </ScrollView>
      )}

      <ReviewSheet
        visible={showReview}
        match={reviewTarget}
        onSubmit={handleSubmitReview}
        onClose={(): void => setShowReview(false)}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  skeletonContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    color: colors.text.tertiary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subValue: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  directionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  directionsText: {
    fontSize: 14,
    color: colors.accent.primary,
    fontWeight: '500',
  },
});
