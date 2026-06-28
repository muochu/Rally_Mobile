import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarEventPreview } from '@/components/feature/calendar-event-preview';
import { Button } from '@/components/ui/button';
import {
  decodeSlotId,
  formatDuration,
  formatSlotDate,
  formatTimeRange,
} from '@/lib/format-slot';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export default function BookedScreen(): ReactElement | null {
  const router = useRouter();
  const { slotId, name, calDenied, mode } = useLocalSearchParams<{
    matchId: string;
    slotId: string;
    name?: string;
    calDenied?: string;
    mode?: string;
  }>();

  const opponentName = name ?? 'Player';
  const calendarDenied = calDenied === 'true';
  const isRequestMode = mode === 'requested';
  const slot = decodeSlotId(slotId ?? '');

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!slot) {
      router.back();
      return;
    }
    if (isRequestMode) {
      haptics.success();
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    haptics.heavy();
    const t = setTimeout((): void => {
      haptics.success();
    }, 180);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    return (): void => clearTimeout(t);
  }, [scale, opacity, slot, router, isRequestMode]);

  const handleViewInCalendar = async (): Promise<void> => {
    if (!slot) return;
    const unixSeconds = Math.floor(slot.start.getTime() / 1000);
    await Linking.openURL(`calshow:${unixSeconds}`);
  };

  if (!slot) return null;

  const { start, end } = slot;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success animation */}
        <View style={styles.heroSection}>
          <Animated.View
            style={[styles.checkCircle, { transform: [{ scale }] }]}
          >
            <Check size={40} color={colors.text.inverse} strokeWidth={2.5} />
          </Animated.View>
          <Animated.View style={{ opacity }}>
            <Text style={styles.heroTitle}>
              {isRequestMode ? 'Request sent!' : 'Match scheduled'}
            </Text>
            <Text style={styles.heroSub}>
              {isRequestMode
                ? `${opponentName} will be notified and can accept your request.`
                : `${formatSlotDate(start)} · ${formatTimeRange(start, end)} · ${formatDuration(start, end)}`}
            </Text>
          </Animated.View>
        </View>

        {/* Calendar event preview — only shown when match is booked */}
        {!isRequestMode && (
          <Animated.View style={[styles.previewSection, { opacity }]}>
            <CalendarEventPreview
              label="Your calendar event"
              title="Tennis match – Rally"
              dateLabel={formatSlotDate(start)}
              timeRange={formatTimeRange(start, end)}
            />
          </Animated.View>
        )}

        {/* Calendar denied banner */}
        {calendarDenied && (
          <View style={styles.bannerWarn}>
            <Text style={styles.bannerText}>
              Calendar access was denied. Add this event manually.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!isRequestMode && !calendarDenied && (
          <Pressable
            style={styles.calendarLink}
            onPress={handleViewInCalendar}
            accessibilityRole="button"
            accessibilityLabel="View in Calendar"
          >
            <Text style={styles.calendarLinkText}>View in Calendar</Text>
          </Pressable>
        )}
        <Button
          label={isRequestMode ? 'Back to Hub' : 'Done'}
          onPress={() =>
            router.navigate(
              '/(tabs)/hub' as Parameters<typeof router.navigate>[0],
            )
          }
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xxxl,
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.hero,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroSub: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  previewSection: {
    gap: spacing.lg,
  },
  bannerWarn: {
    backgroundColor: '#FEF3C7',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  bannerText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    gap: spacing.md,
  },
  calendarLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  calendarLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
  },
});
