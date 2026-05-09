import { useQueryClient } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FreeWindowCard } from '@/components/feature/free-window-card';
import type { NearbyPlayer } from '@/components/feature/player-card';
import { PlayerCard } from '@/components/feature/player-card';
import { PlayerProfileSheet } from '@/components/feature/player-profile-sheet';
import {
  SkeletonFreeWindowCard,
  SkeletonPlayerCard,
} from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { syncAvailability } from '@/hooks/use-availability-sync';
import { useFreeWindows } from '@/hooks/use-free-windows';
import { useNearbyPlayers } from '@/hooks/use-nearby-players';
import { useProfile } from '@/hooks/use-profile';
import { trackEvent } from '@/lib/analytics';
import type { BusyInterval, FreeSlot } from '@/lib/calendar/types';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type SkillFilter = 'all' | 'similar';

export default function HubScreen(): ReactElement {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [selectedPlayer, setSelectedPlayer] = useState<NearbyPlayer | null>(
    null,
  );
  const [selectedSlots, setSelectedSlots] = useState<FreeSlot[]>([]);
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarDenied, setCalendarDenied] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect((): void => {
    Calendar.getCalendarPermissionsAsync().then(({ status }) => {
      if (status === 'granted') setCalendarConnected(true);
    });
  }, []);

  const { profile } = useProfile(userId);
  const preferred = profile?.preferred_hours ?? null;

  const {
    daySummaries,
    isLoading: windowsLoading,
    hasBlocks,
  } = useFreeWindows(userId, preferred);

  const emptyBusy = useMemo((): BusyInterval[] => [], []);
  const { players, isLoading: playersLoading } = useNearbyPlayers(
    userId,
    emptyBusy,
    preferred,
  );

  const filteredPlayers = useMemo(() => {
    if (skillFilter === 'all') return players;
    // 'similar' filter requires user's own UTR — available in Phase 9 profile fetch
    return players;
  }, [players, skillFilter]);

  const handlePlayerPress = useCallback(
    (player: NearbyPlayer): void => {
      const found = players.find((p) => p.id === player.id);
      setSelectedPlayer(player);
      setSelectedSlots(found?.mutual_slots ?? []);
    },
    [players],
  );

  const handleCloseSheet = useCallback((): void => {
    setSelectedPlayer(null);
  }, []);

  const handleSchedule = useCallback(
    (playerId: string): void => {
      const name = selectedPlayer?.full_name ?? '';
      setSelectedPlayer(null);
      router.push(
        `/match/picker/${playerId}?name=${encodeURIComponent(name)}` as Parameters<
          typeof router.push
        >[0],
      );
    },
    [router, selectedPlayer],
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await syncAvailability();
      await queryClient.invalidateQueries({
        queryKey: ['availability-blocks'],
      });
      await queryClient.invalidateQueries({ queryKey: ['nearby-players'] });
      haptics.success();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const handleConnectCalendar = useCallback(async (): Promise<void> => {
    const existing = await Calendar.getCalendarPermissionsAsync();
    if (existing.status === 'denied' && !existing.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      haptics.success();
      setCalendarDenied(false);
      setCalendarConnected(true);
      trackEvent('calendar_connected', { provider: 'apple' });
      await syncAvailability();
      await queryClient.invalidateQueries({
        queryKey: ['availability-blocks'],
      });
    } else {
      setCalendarDenied(true);
    }
  }, [queryClient]);

  const showCalendarEmpty = !calendarConnected && !hasBlocks && !windowsLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule a match</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {showCalendarEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>Connect your calendar</Text>
            <Text style={styles.emptyBody}>
              Rally reads only your free/busy times to find players who share
              your schedule.
            </Text>
            {calendarDenied && (
              <Text style={styles.emptyError}>
                Permission denied. Enable calendar access in Settings → Privacy
                → Calendars.
              </Text>
            )}
            <Pressable
              style={styles.emptyButton}
              onPress={handleConnectCalendar}
              accessibilityRole="button"
              accessibilityLabel="Connect Apple Calendar"
            >
              <Text style={styles.emptyButtonText}>Get started</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your free windows</Text>
              {windowsLoading ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardScroll}
                >
                  {[0, 1, 2].map((i) => (
                    <SkeletonFreeWindowCard key={i} />
                  ))}
                </ScrollView>
              ) : daySummaries.length === 0 ? (
                <Text style={styles.emptySection}>
                  No free time found. Add events to your calendar to see gaps.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardScroll}
                >
                  {daySummaries.map((s) => (
                    <FreeWindowCard key={s.dateKey} summary={s} />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.filterRow}>
              {(['all', 'similar'] as SkillFilter[]).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, skillFilter === f && styles.chipActive]}
                  onPress={() => {
                    haptics.light();
                    setSkillFilter(f);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    f === 'all' ? 'All skill levels' : 'Similar UTR'
                  }
                  accessibilityState={{ selected: skillFilter === f }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      skillFilter === f && styles.chipTextActive,
                    ]}
                  >
                    {f === 'all' ? 'All levels' : 'Similar UTR'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Players nearby</Text>
              {playersLoading ? (
                <View style={styles.playerList}>
                  {[0, 1, 2].map((i) => (
                    <View key={i}>
                      {i > 0 && <View style={styles.divider} />}
                      <SkeletonPlayerCard />
                    </View>
                  ))}
                </View>
              ) : filteredPlayers.length === 0 ? (
                <View style={styles.noPlayersState}>
                  <Text style={styles.emptyTitle}>No players nearby yet</Text>
                  <Text style={styles.emptyBody}>
                    Try expanding your search radius or invite a friend to
                    Rally.
                  </Text>
                </View>
              ) : (
                <View style={styles.playerList}>
                  {filteredPlayers.map((player, i) => (
                    <View key={player.id}>
                      {i > 0 && <View style={styles.divider} />}
                      <PlayerCard player={player} onPress={handlePlayerPress} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <PlayerProfileSheet
        player={selectedPlayer}
        mutualSlots={selectedSlots}
        onSchedule={handleSchedule}
        onClose={handleCloseSheet}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  cardScroll: {
    paddingRight: spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  chipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  playerList: {},
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  noPlayersState: {
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyError: {
    fontSize: 13,
    color: colors.status.error,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  emptySection: {
    fontSize: 14,
    color: colors.text.tertiary,
    lineHeight: 20,
  },
});
