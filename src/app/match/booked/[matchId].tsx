import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
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
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export default function BookedScreen(): ReactElement {
  const router = useRouter();
  const { slotId, name, calDenied } = useLocalSearchParams<{
    matchId: string;
    slotId: string;
    name?: string;
    calDenied?: string;
  }>();

  const opponentName = name ?? 'Player';
  const calendarDenied = calDenied === 'true';
  const { start, end } = decodeSlotId(slotId);

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [scale, opacity]);

  const handleViewInCalendar = async (): Promise<void> => {
    const unixSeconds = Math.floor(start.getTime() / 1000);
    await Linking.openURL(`calshow:${unixSeconds}`);
  };

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
            <Text style={styles.heroTitle}>Match scheduled</Text>
            <Text style={styles.heroSub}>
              {formatSlotDate(start)} · {formatTimeRange(start, end)} ·{' '}
              {formatDuration(start, end)}
            </Text>
          </Animated.View>
        </View>

        {/* Calendar event previews */}
        <Animated.View style={[styles.previewSection, { opacity }]}>
          <CalendarEventPreview
            label="Your calendar event"
            title="Tennis match – Rally"
            dateLabel={formatSlotDate(start)}
            timeRange={formatTimeRange(start, end)}
          />
          <CalendarEventPreview
            label={`${opponentName}'s invite`}
            title="Tennis match – Rally"
            dateLabel={formatSlotDate(start)}
            timeRange={formatTimeRange(start, end)}
          />
        </Animated.View>

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
        {!calendarDenied && (
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
          label="Done"
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
