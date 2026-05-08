import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { reportError, UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { PreferredHours } from '@/store/onboarding';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type HourKey = keyof PreferredHours;

const OPTIONS: { key: HourKey; label: string }[] = [
  { key: 'weekday_morning', label: 'Weekday morning' },
  { key: 'weekday_evening', label: 'Weekday evening' },
  { key: 'weekend', label: 'Weekend' },
];

export default function Step5HoursScreen(): ReactElement {
  const router = useRouter();
  const store = useOnboardingStore();
  const [hours, setHours] = useState<PreferredHours>({
    ...store.preferredHours,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleHour = (key: HourKey): void => {
    setHours((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (): void => {
    setHours({ weekday_morning: true, weekday_evening: true, weekend: true });
  };

  const handleFinish = async (): Promise<void> => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session)
        throw new UserFacingError('Session expired. Please sign in again.');

      const preferredHoursPayload = {
        ...hours,
        gender: store.gender ?? undefined,
        calendar_permission: store.calendarPermission ?? undefined,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          city: store.city ?? 'Unknown',
          utr_rating: store.utrRating,
          preferred_hours: preferredHoursPayload,
        })
        .eq('id', session.user.id);

      if (error)
        throw new UserFacingError(
          'Could not save your profile. Please try again.',
        );

      trackEvent('onboarding_completed');
      store.reset();
      router.replace('/(tabs)/hub');
    } catch (err) {
      if (err instanceof UserFacingError) {
        setSaveError(err.message);
      } else {
        reportError(err, { context: 'onboardingComplete' });
        setSaveError('Could not save. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const anySelected =
    hours.weekday_morning || hours.weekday_evening || hours.weekend;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>When do you prefer to play?</Text>

        <View style={styles.chips}>
          {OPTIONS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => toggleHour(key)}
              style={[styles.chip, hours[key] && styles.chipSelected]}
              accessibilityRole="checkbox"
              accessibilityLabel={label}
              accessibilityState={{ checked: hours[key] }}
            >
              <Text
                style={[
                  styles.chipLabel,
                  hours[key] && styles.chipLabelSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={selectAll}
            style={[
              styles.chip,
              !hours.weekday_morning || !hours.weekday_evening || !hours.weekend
                ? undefined
                : styles.chipSelected,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Anytime"
          >
            <Text style={styles.chipLabel}>Anytime</Text>
          </Pressable>
        </View>

        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
      </View>

      <View style={styles.footer}>
        <Button
          label={isSaving ? 'Saving…' : 'Get started'}
          onPress={handleFinish}
          disabled={!anySelected || isSaving}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.primary,
  },
  chipLabelSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: colors.status.error,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
