import { useQueryClient } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarConnectPrompt } from '@/components/feature/calendar-connect-prompt';
import { FreeWindowsSection } from '@/components/feature/free-windows-section';
import type { NearbyPlayer } from '@/components/feature/player-card';
import { PlayerProfileSheet } from '@/components/feature/player-profile-sheet';
import type { SkillFilter } from '@/components/feature/players-nearby-section';
import { PlayersNearbySection } from '@/components/feature/players-nearby-section';
import { useAuth } from '@/hooks/use-auth';
import { syncAvailability } from '@/hooks/use-availability-sync';
import { useFreeWindows } from '@/hooks/use-free-windows';
import { useNearbyPlayers } from '@/hooks/use-nearby-players';
import { useProfile } from '@/hooks/use-profile';
import { trackEvent } from '@/lib/analytics';
import type { BusyInterval, FreeSlot } from '@/lib/calendar/types';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

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
    const userUtr = profile?.utr_rating;
    if (userUtr == null) return players;
    return players.filter(
      (p) => p.utr_rating != null && Math.abs(p.utr_rating - userUtr) <= 1.5,
    );
  }, [players, skillFilter, profile?.utr_rating]);

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
          <CalendarConnectPrompt
            calendarDenied={calendarDenied}
            onConnect={handleConnectCalendar}
          />
        ) : (
          <>
            <FreeWindowsSection
              daySummaries={daySummaries}
              isLoading={windowsLoading}
            />
            <PlayersNearbySection
              filteredPlayers={filteredPlayers}
              playersLoading={playersLoading}
              skillFilter={skillFilter}
              onFilterChange={setSkillFilter}
              onPlayerPress={handlePlayerPress}
            />
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
});
