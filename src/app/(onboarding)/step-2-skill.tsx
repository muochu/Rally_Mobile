import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const ANCHORS = [
  { value: 1, label: 'Beginner' },
  { value: 5, label: 'Intermediate' },
  { value: 10, label: 'Advanced' },
  { value: 16, label: 'Pro' },
];

export default function Step2SkillScreen(): ReactElement {
  const router = useRouter();
  const setUtrRating = useOnboardingStore((s) => s.setUtrRating);
  const stored = useOnboardingStore((s) => s.utrRating);
  const storedUnknown = useOnboardingStore((s) => s.utrUnknown);

  const [rating, setRating] = useState(stored ?? 5);
  const [unknown, setUnknown] = useState(storedUnknown);

  const handleContinue = (): void => {
    setUtrRating(unknown ? null : rating, unknown);
    router.push('/(onboarding)/step-3-location');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>What's your skill level?</Text>

        {!unknown && (
          <View style={styles.sliderSection}>
            <Text style={styles.ratingDisplay}>{rating.toFixed(1)} UTR</Text>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={16}
              step={0.5}
              value={rating}
              onValueChange={setRating}
              minimumTrackTintColor={colors.accent.primary}
              maximumTrackTintColor={colors.border.secondary}
              thumbTintColor={colors.accent.primary}
              accessibilityLabel="UTR rating slider"
            />

            <View style={styles.anchors}>
              {ANCHORS.map(({ value, label }) => (
                <Text key={value} style={styles.anchor}>
                  {label}
                </Text>
              ))}
            </View>
          </View>
        )}

        {unknown && (
          <View style={styles.unknownPlaceholder}>
            <Text style={styles.unknownText}>
              No problem — we'll help you figure it out
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => setUnknown((prev) => !prev)}
          style={styles.unknownToggle}
          accessibilityRole="checkbox"
          accessibilityLabel="I don't know my UTR"
          accessibilityState={{ checked: unknown }}
        >
          <View style={[styles.checkbox, unknown && styles.checkboxChecked]} />
          <Text style={styles.unknownLabel}>I don't know my UTR</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Button label="Continue" onPress={handleContinue} fullWidth />
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
  sliderSection: {
    gap: spacing.lg,
  },
  ratingDisplay: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.accent.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  anchors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  anchor: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unknownPlaceholder: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  unknownText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  unknownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.elevated,
  },
  checkboxChecked: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  unknownLabel: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
