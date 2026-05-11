import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BusyInterval } from '@/lib/calendar/types';
import type { PreferredHours } from '@/lib/overlap';
import { findMutualFreeSlots } from '@/lib/overlap';
import { supabase } from '@/lib/supabase';

const LOOKAHEAD_DAYS = 14;
const MIN_DURATION_MINUTES = 60;
const MAX_DAYS_SHOWN = 7;

export type DaySummary = {
  dateKey: string;
  date: Date;
  dayLabel: string; // "Today", "Sat", "Sun" …
  dateLabel: string; // "May 9"
  timeLabel: string; // "All day", "Morning", "Evening", "8–10pm"
  freeHours: number;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const fmtTime = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour}${period}`
    : `${hour}:${String(m).padStart(2, '0')}${period}`;
};

const toTimeLabel = (freeHours: number, start: Date, end: Date): string => {
  if (freeHours >= 10) return 'All day';
  if (freeHours >= 6) {
    const startH = start.getHours();
    const endH = end.getHours();
    if (startH <= 7 && endH >= 18) return 'All day';
    if (startH <= 9) return 'Morning';
    if (endH >= 17) return 'Evening';
  }
  if (freeHours >= 3) {
    const startH = start.getHours();
    if (startH <= 9) return 'Morning';
    if (startH >= 17) return 'Evening';
  }
  return `${fmtTime(start)} – ${fmtTime(end)}`;
};

export const useFreeWindows = (
  userId: string | undefined,
  preferred?: PreferredHours | null,
): {
  daySummaries: DaySummary[];
  isLoading: boolean;
  hasBlocks: boolean;
} => {
  const { data: blocks, isLoading } = useQuery({
    queryKey: ['availability-blocks', userId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!userId) return [];
      const windowStart = new Date();
      const windowEnd = new Date(
        windowStart.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
      );
      const { data } = await supabase
        .from('availability_blocks')
        .select('start_time, end_time')
        .eq('user_id', userId)
        .gte('start_time', windowStart.toISOString())
        .lt('start_time', windowEnd.toISOString())
        .order('start_time');
      return data ?? [];
    },
    enabled: Boolean(userId),
  });

  const daySummaries = useMemo((): DaySummary[] => {
    if (!blocks) return [];

    const busy: BusyInterval[] = blocks.map((b) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }));

    const windows = findMutualFreeSlots(busy, [], {
      lookaheadDays: LOOKAHEAD_DAYS,
      minDurationMinutes: MIN_DURATION_MINUTES,
    });

    const MIN_HOUR = 7;
    const MAX_HOUR = 22; // display window: 7am–10pm

    // Expand each window into per-day free blocks
    const byDay = new Map<
      string,
      { date: Date; start: Date; end: Date; hours: number }
    >();

    for (const win of windows) {
      let cursor = new Date(win.start);
      while (cursor < win.end) {
        const dayStart = new Date(cursor);
        dayStart.setHours(MIN_HOUR, 0, 0, 0);
        const dayEnd = new Date(cursor);
        dayEnd.setHours(MAX_HOUR, 0, 0, 0);

        const effectiveStart = cursor > dayStart ? cursor : dayStart;
        const effectiveEnd = win.end < dayEnd ? win.end : dayEnd;

        if (effectiveStart < effectiveEnd) {
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
          const existingHours = byDay.get(key)?.hours ?? 0;
          const freeHours =
            (effectiveEnd.getTime() - effectiveStart.getTime()) / 3_600_000;

          if (!byDay.has(key) || freeHours > existingHours) {
            byDay.set(key, {
              date: new Date(
                cursor.getFullYear(),
                cursor.getMonth(),
                cursor.getDate(),
              ),
              start: effectiveStart,
              end: effectiveEnd,
              hours: freeHours,
            });
          }
        }

        // Advance to next day
        const next = new Date(cursor);
        next.setDate(next.getDate() + 1);
        next.setHours(MIN_HOUR, 0, 0, 0);
        cursor = next;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const hasPreference =
      preferred != null &&
      (preferred.weekday_morning ||
        preferred.weekday_evening ||
        preferred.weekend);

    return [...byDay.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .filter(({ date }) => {
        if (!hasPreference) return true;
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;
        if (isWeekend) return preferred!.weekend;
        return preferred!.weekday_morning || preferred!.weekday_evening;
      })
      .slice(0, MAX_DAYS_SHOWN)
      .map(({ date, start, end, hours }) => {
        const isToday = date.getTime() === today.getTime();
        const isTomorrow = date.getTime() === tomorrow.getTime();
        const dayLabel = isToday
          ? 'Today'
          : isTomorrow
            ? 'Tomorrow'
            : DAY_NAMES[date.getDay()];
        const dateLabel = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
        const timeLabel = toTimeLabel(hours, start, end);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

        return {
          dateKey: key,
          date,
          dayLabel,
          dateLabel,
          timeLabel,
          freeHours: hours,
        };
      });
  }, [blocks, preferred]);

  return {
    daySummaries,
    isLoading,
    hasBlocks: (blocks?.length ?? 0) > 0,
  };
};
