import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

interface CalendarEventPreviewProps {
  title: string;
  dateLabel: string;
  timeRange: string;
  label?: string;
}

export function CalendarEventPreview({
  title,
  dateLabel,
  timeRange,
  label,
}: CalendarEventPreviewProps): ReactElement {
  return (
    <View style={styles.wrapper}>
      {label !== undefined && <Text style={styles.sectionLabel}>{label}</Text>}
      <View style={styles.container}>
        <View style={styles.leftBorder} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta}>{dateLabel}</Text>
          <Text style={styles.meta}>{timeRange}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.accent.soft,
    borderTopRightRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
    overflow: 'hidden',
  },
  leftBorder: {
    width: 3,
    backgroundColor: colors.accent.primary,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.text,
  },
  meta: {
    fontSize: 12,
    color: colors.accent.text,
    opacity: 0.75,
  },
});
