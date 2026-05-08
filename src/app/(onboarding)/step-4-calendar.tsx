import * as Calendar from 'expo-calendar';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { reportError } from '@/lib/errors';
import type { CalendarPermission } from '@/store/onboarding';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function Step4CalendarScreen(): ReactElement {
  const router = useRouter();
  const setCalendarPermission = useOnboardingStore(
    (s) => s.setCalendarPermission,
  );
  const [isRequesting, setIsRequesting] = useState(false);

  const requestAndAdvance = async (
    status: CalendarPermission,
  ): Promise<void> => {
    setCalendarPermission(status);
    if (status === 'granted') {
      trackEvent('calendar_connected', { provider: 'apple' });
    }
    router.push('/(onboarding)/step-5-hours');
  };

  const handleConnect = async (): Promise<void> => {
    setIsRequesting(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      await requestAndAdvance(status === 'granted' ? 'granted' : 'denied');
    } catch (err) {
      reportError(err, { context: 'calendarPermission' });
      await requestAndAdvance('denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = (): void => {
    requestAndAdvance('skipped');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Connect your calendar</Text>
        <Text style={styles.subtitle}>
          Rally reads only free/busy times — never event titles, locations, or
          attendees.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.bullet} />
            <Text style={styles.cardText}>
              Find when you and nearby players are both free
            </Text>
          </View>
          <View style={styles.cardRow}>
            <View style={styles.bullet} />
            <Text style={styles.cardText}>
              No event content ever leaves your device
            </Text>
          </View>
          <View style={styles.cardRow}>
            <View style={styles.bullet} />
            <Text style={styles.cardText}>
              Revoke access any time from your profile
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label={isRequesting ? 'Connecting…' : 'Connect Apple Calendar'}
          onPress={handleConnect}
          disabled={isRequesting}
          fullWidth
        />
        <Button
          label="Skip for now"
          onPress={handleSkip}
          variant="tertiary"
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
    marginTop: -spacing.md,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
    marginTop: 6,
  },
  cardText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
});
