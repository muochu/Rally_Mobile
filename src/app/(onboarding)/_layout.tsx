import { Stack, usePathname, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const STEP_COUNT = 5;

const getStep = (pathname: string): number => {
  const match = /step-(\d)/.exec(pathname);
  return match ? parseInt(match[1], 10) : 1;
};

export default function OnboardingLayout(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const currentStep = getStep(pathname);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {currentStep > 1 ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft
              color={colors.text.primary}
              size={24}
              strokeWidth={1.5}
            />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.dots}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < currentStep ? styles.dotActive : styles.dotUpcoming,
              ]}
            />
          ))}
        </View>

        <View style={styles.backButton} />
      </View>

      <Stack
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
  },
  dotUpcoming: {
    borderWidth: 1.5,
    borderColor: colors.border.secondary,
    backgroundColor: 'transparent',
  },
});
