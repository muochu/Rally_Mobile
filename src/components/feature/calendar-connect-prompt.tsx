import { Calendar } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  calendarDenied: boolean;
  onConnect: () => void;
};

export function CalendarConnectPrompt({
  calendarDenied,
  onConnect,
}: Props): ReactElement {
  return (
    <View style={styles.container}>
      <Calendar size={32} color={colors.accent.primary} strokeWidth={1.5} />
      <Text style={styles.title}>Connect your calendar</Text>
      <Text style={styles.body}>
        Rally reads only your free/busy times to find players who share your
        schedule.
      </Text>
      {calendarDenied && (
        <Text style={styles.error}>
          Permission denied. Enable calendar access in Settings → Privacy →
          Calendars.
        </Text>
      )}
      <Pressable
        style={styles.button}
        onPress={onConnect}
        accessibilityRole="button"
        accessibilityLabel="Connect Apple Calendar"
      >
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    fontSize: 13,
    color: colors.status.error,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
