import type { ReactElement } from 'react';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PreferredHours } from '@/hooks/use-profile';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type HourKey = keyof PreferredHours;

const HOUR_OPTIONS: { key: HourKey; label: string; sub: string }[] = [
  { key: 'weekday_morning', label: 'Weekday mornings', sub: '7am – noon' },
  { key: 'weekday_evening', label: 'Weekday evenings', sub: '5pm – 9pm' },
  { key: 'weekend', label: 'Weekends', sub: 'Sat & Sun all day' },
];

type Props = {
  preferred: PreferredHours;
  onToggle: (key: HourKey) => void;
};

export function PreferredHoursSection({
  preferred,
  onToggle,
}: Props): ReactElement {
  return (
    <View style={styles.grid}>
      {HOUR_OPTIONS.map(({ key, label, sub }) => {
        const active = preferred[key];
        return (
          <Pressable
            key={key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={(): void => onToggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
          >
            <View style={styles.chipText}>
              <Text style={[styles.label, active && styles.labelActive]}>
                {label}
              </Text>
              <Text style={[styles.sub, active && styles.subActive]}>
                {sub}
              </Text>
            </View>
            {active && (
              <Check
                size={16}
                color={colors.accent.primary}
                strokeWidth={2.5}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.elevated,
  },
  chipActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  chipText: {
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  labelActive: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  sub: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  subActive: {
    color: colors.accent.secondary,
  },
});
