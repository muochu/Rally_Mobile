import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type MatchDetail = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: 'upcoming' | 'completed' | 'cancelled';
  opponentName: string;
  opponentId: string;
  courtName: string | null;
  courtAddress: string | null;
  courtLat: number | null;
  courtLng: number | null;
};

const fetchMatch = async (id: string): Promise<MatchDetail | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const myId = session.user.id;

  const { data: match } = await supabase
    .from('matches')
    .select('*, courts(name, address, latitude, longitude)')
    .eq('id', id)
    .single();

  if (!match) return null;

  const opponentId = match.player_a === myId ? match.player_b : match.player_a;
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', opponentId)
    .single();

  const court =
    (match.courts as unknown as {
      name: string;
      address: string | null;
      latitude: number;
      longitude: number;
    } | null) ?? null;

  return {
    id: match.id,
    startTime: new Date(match.start_time),
    endTime: new Date(match.end_time),
    status: match.status as MatchDetail['status'],
    opponentName: profile?.full_name ?? 'Unknown player',
    opponentId,
    courtName: court?.name ?? null,
    courtAddress: court?.address ?? null,
    courtLat: court?.latitude ?? null,
    courtLng: court?.longitude ?? null,
  };
};

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

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => fetchMatch(id ?? ''),
    enabled: !!id,
  });

  const handleDirections = (): void => {
    if (!match?.courtLat || !match?.courtLng) return;
    void Linking.openURL(
      `https://maps.apple.com/?daddr=${match.courtLat},${match.courtLng}&dirflg=d`,
    );
  };

  const handleRematch = (): void => {
    if (!match) return;
    router.push(
      `/match/picker/${match.opponentId}?name=${encodeURIComponent(match.opponentName)}` as Parameters<
        typeof router.push
      >[0],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.headerTitle}>Match</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} />
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
          {/* Status badge */}
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

          {/* Opponent */}
          <View style={styles.card}>
            <Text style={styles.label}>Opponent</Text>
            <Text style={styles.value}>{match.opponentName}</Text>
          </View>

          {/* Date & time */}
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

          {/* Court */}
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

          {/* Actions */}
          {match.status === 'completed' && (
            <Pressable style={styles.primaryBtn} onPress={handleRematch}>
              <Text style={styles.primaryBtnText}>Rematch</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
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
  primaryBtn: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
