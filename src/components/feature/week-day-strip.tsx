import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DaySummary } from '@/hooks/use-free-windows';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const DAY_LETTERS = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'S'];

type Props = {
  weekDays: Date[];
  daySummaries: DaySummary[];
  selectedDateKey: string | null;
  weekOffset: 0 | 1;
  hasNextWeek: boolean;
  onSelectDay: (dateKey: string) => void;
  onWeekChange: (offset: 0 | 1) => void;
};

export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function WeekDayStrip({
  weekDays,
  daySummaries,
  selectedDateKey,
  weekOffset,
  hasNextWeek,
  onSelectDay,
  onWeekChange,
}: Props): ReactElement {
  const summaryMap = new Map(daySummaries.map((s) => [s.dateKey, s]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  return (
    <View style={styles.container}>
      <View style={styles.strip}>
        {weekDays.map((date) => {
          const key = toDateKey(date);
          const hasFree = summaryMap.has(key);
          const isSelected = key === selectedDateKey;
          const isToday = key === todayKey;

          return (
            <Pressable
              key={key}
              style={styles.dayCol}
              onPress={() => {
                if (!hasFree) return;
                haptics.light();
                onSelectDay(key);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}${hasFree ? ', has free time' : ', no free time'}`}
            >
              <Text style={[styles.dayLetter, !hasFree && styles.dim]}>
                {DAY_LETTERS[date.getDay()]}
              </Text>
              <View
                style={[
                  styles.circle,
                  isToday && !isSelected && styles.circleToday,
                  isSelected && styles.circleSelected,
                  !hasFree && styles.circleDim,
                ]}
              >
                <Text
                  style={[
                    styles.dateNum,
                    isSelected && styles.dateNumSelected,
                    !hasFree && styles.dateNumDim,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View style={[styles.dot, hasFree && !isSelected && styles.dotVisible]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.weekNav}>
        {weekOffset === 1 && (
          <Pressable
            onPress={() => {
              haptics.light();
              onWeekChange(0);
            }}
            hitSlop={10}
          >
            <Text style={styles.weekNavText}>← This week</Text>
          </Pressable>
        )}
        {weekOffset === 0 && hasNextWeek && (
          <Pressable
            style={styles.weekNavRight}
            onPress={() => {
              haptics.light();
              onWeekChange(1);
            }}
            hitSlop={10}
          >
            <Text style={styles.weekNavText}>Next week →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
  dim: {
    opacity: 0.35,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleToday: {
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
  circleSelected: {
    backgroundColor: colors.accent.primary,
  },
  circleDim: {
    opacity: 0.3,
  },
  dateNum: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  dateNumSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateNumDim: {
    color: colors.text.tertiary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotVisible: {
    backgroundColor: colors.accent.primary,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    height: 28,
  },
  weekNavRight: {
    marginLeft: 'auto',
  },
  weekNavText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent.primary,
  },
});
