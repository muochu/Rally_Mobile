import { useQueryClient } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
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
import type { FreeSlot } from '@/lib/calendar/types';
import { reportError } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export { TabErrorFallback as ErrorBoundary } from '@/components/ui/tab-error-fallback';

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

  const checkCalendarPermission = useCallback((): void => {
    void Calendar.getCalendarPermissions().then(({ status }) => {
      if (status === 'granted') {
        setCalendarConnected(true);
        setCalendarDenied(false);
      } else {
        setCalendarConnected(false);
      }
    });
  }, []);

  useEffect((): void => {
    checkCalendarPermission();
  }, [checkCalendarPermission]);

  // Re-check when app comes back to foreground (user may have enabled in Settings)
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        checkCalendarPermission();
      }
      appStateRef.current = next;
    });
    return (): void => sub.remove();
  }, [checkCalendarPermission]);

  const { profile } = useProfile(userId);
  const preferred = profile?.preferred_hours ?? null;

  const {
    daySummaries,
    busyIntervals,
    isLoading: windowsLoading,
    hasBlocks,
  } = useFreeWindows(userId, preferred);

  const { players, isLoading: playersLoading } = useNearbyPlayers(
    userId,
    busyIntervals,
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
    try {
      const existing = await Calendar.getCalendarPermissions();
      if (existing.status === 'denied' && !existing.canAskAgain) {
        Alert.alert(
          'Calendar access needed',
          'Rally needs calendar access to find shared availability. Enable it in Settings → Privacy & Security → Calendars.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: (): void => {
                void Linking.openSettings();
              },
            },
          ],
        );
        return;
      }
      const { status } = await Calendar.requestCalendarPermissions();
      if (status === 'granted') {
        haptics.success();
        setCalendarDenied(false);
        setCalendarConnected(true);
        trackEvent('calendar_connected', { provider: 'apple' });
        try {
          await syncAvailability();
          await queryClient.invalidateQueries({
            queryKey: ['availability-blocks'],
          });
        } catch (err) {
          reportError(err, { context: 'handleConnectCalendar-sync' });
          Alert.alert(
            'Connected, but sync failed',
            'Apple Calendar is connected, but we could not sync your availability yet. Pull to refresh to try again.',
          );
        }
      } else {
        setCalendarDenied(true);
      }
    } catch (err) {
      reportError(err, { context: 'handleConnectCalendar' });
      Alert.alert(
        'Connection failed',
        'Could not connect to Apple Calendar. Please try again.',
      );
    }
  }, [queryClient]);

  const showCalendarEmpty = !calendarConnected && !hasBlocks && !windowsLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule a match</Text>
      </View>

      {showCalendarEmpty ? (
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
          <CalendarConnectPrompt
            calendarDenied={calendarDenied}
            onConnect={handleConnectCalendar}
          />
        </ScrollView>
      ) : (
        <>
          <FreeWindowsSection
            daySummaries={daySummaries}
            isLoading={windowsLoading}
          />
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
            <PlayersNearbySection
              filteredPlayers={filteredPlayers}
              playersLoading={playersLoading}
              skillFilter={skillFilter}
              onFilterChange={setSkillFilter}
              onPlayerPress={handlePlayerPress}
            />
          </ScrollView>
        </>
      )}

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
