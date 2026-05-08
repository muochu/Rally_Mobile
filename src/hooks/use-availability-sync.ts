import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getAppleBusyIntervals } from '@/lib/calendar/apple';
import { getGoogleBusyIntervals } from '@/lib/calendar/google';
import type { BusyInterval } from '@/lib/calendar/types';
import { reportError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

const LOOKAHEAD_DAYS = 14;

const syncSource = async (
  userId: string,
  source: 'apple' | 'google',
  intervals: BusyInterval[],
  windowStart: Date,
  windowEnd: Date,
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('availability_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('source', source)
    .gte('start_time', windowStart.toISOString())
    .lt('start_time', windowEnd.toISOString());

  if (deleteError) {
    reportError(deleteError, { context: 'availabilitySync:delete', source });
    return;
  }

  if (intervals.length === 0) return;

  const rows = intervals.map((interval) => ({
    user_id: userId,
    start_time: interval.start.toISOString(),
    end_time: interval.end.toISOString(),
    source,
  }));

  const { error: insertError } = await supabase
    .from('availability_blocks')
    .insert(rows);
  if (insertError) {
    reportError(insertError, { context: 'availabilitySync:insert', source });
  }
};

export const syncAvailability = async (): Promise<void> => runSync();

const runSync = async (): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const windowStart = new Date();
  const windowEnd = new Date(
    windowStart.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
  );

  const [appleIntervals, googleIntervals] = await Promise.all([
    getAppleBusyIntervals(LOOKAHEAD_DAYS),
    getGoogleBusyIntervals(),
  ]);

  await Promise.all([
    syncSource(
      session.user.id,
      'apple',
      appleIntervals,
      windowStart,
      windowEnd,
    ),
    syncSource(
      session.user.id,
      'google',
      googleIntervals,
      windowStart,
      windowEnd,
    ),
  ]);
};

export const useAvailabilitySync = (): void => {
  useEffect((): (() => void) => {
    void runSync();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runSync();
      }
    });

    return () => subscription.remove();
  }, []);
};
