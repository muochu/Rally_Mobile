import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FreeWindowCard } from '@/components/feature/free-window-card';
import { SkeletonFreeWindowCard } from '@/components/ui/skeleton';
import type { DaySummary } from '@/hooks/use-free-windows';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = {
  daySummaries: DaySummary[];
  isLoading: boolean;
};

export function FreeWindowsSection({
  daySummaries,
  isLoading,
}: Props): ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your free windows</Text>
      {isLoading ? (
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
        <Text style={styles.empty}>
          No free time found. Add events to your calendar to see gaps.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardScroll}
        >
          {daySummaries.map((s, i) => (
            <FreeWindowCard key={s.dateKey} summary={s} staggerIndex={i} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  empty: {
    fontSize: 14,
    color: colors.text.tertiary,
    lineHeight: 20,
  },
});
