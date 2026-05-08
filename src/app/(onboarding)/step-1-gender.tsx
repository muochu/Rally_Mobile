import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import type { Gender } from '@/store/onboarding';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export default function Step1GenderScreen(): ReactElement {
  const router = useRouter();
  const setGender = useOnboardingStore((s) => s.setGender);
  const stored = useOnboardingStore((s) => s.gender);
  const [selected, setSelected] = useState<Gender | null>(stored);

  const handleContinue = (): void => {
    if (!selected) return;
    setGender(selected);
    router.push('/(onboarding)/step-2-skill');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>How do you identify?</Text>
        <Text style={styles.subtitle}>
          Used to match you with compatible players
        </Text>

        <View style={styles.options}>
          {OPTIONS.map(({ label, value }) => (
            <Pressable
              key={value}
              onPress={() => setSelected(value)}
              style={[styles.chip, selected === value && styles.chipSelected]}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: selected === value }}
            >
              <Text
                style={[
                  styles.chipLabel,
                  selected === value && styles.chipLabelSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!selected}
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
    gap: spacing.xl,
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
    marginTop: -spacing.md,
  },
  options: {
    gap: spacing.md,
  },
  chip: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.elevated,
  },
  chipSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  chipLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.primary,
  },
  chipLabelSelected: {
    fontWeight: '600',
    color: colors.accent.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
