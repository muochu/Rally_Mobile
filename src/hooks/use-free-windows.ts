import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BusyInterval } from '@/lib/calendar/types';
import type { FreeSlot } from '@/lib/overlap';
import { findMutualFreeSlots } from '@/lib/overlap';
import { supabase } from '@/lib/supabase';

const LOOKAHEAD_DAYS = 14;
const MIN_DURATION_MINUTES = 60;
const MAX_SHOWN = 5;

export const useFreeWindows = (
  userId: string | undefined,
): {
  freeWindows: FreeSlot[];
  isLoading: boolean;
  hasBlocks: boolean;
} => {
  const { data: blocks, isLoading } = useQuery({
    queryKey: ['availability-blocks', userId],
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

  const freeWindows = useMemo((): FreeSlot[] => {
    if (!blocks || blocks.length === 0) return [];

    const busy: BusyInterval[] = blocks.map((b) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }));

    const slots = findMutualFreeSlots(busy, [], {
      lookaheadDays: LOOKAHEAD_DAYS,
      minDurationMinutes: MIN_DURATION_MINUTES,
    });

    return slots.slice(0, MAX_SHOWN);
  }, [blocks]);

  return {
    freeWindows,
    isLoading,
    hasBlocks: (blocks?.length ?? 0) > 0,
  };
};
