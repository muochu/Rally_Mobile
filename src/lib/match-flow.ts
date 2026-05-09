import * as Calendar from 'expo-calendar';

import { trackEvent } from '@/lib/analytics';

import type { BusyInterval } from './calendar/types';
import { supabase } from './supabase';

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export const isSlotStillFree = (
  myBusy: BusyInterval[],
  theirBusy: BusyInterval[],
  slotStart: Date,
  slotEnd: Date,
): boolean => {
  const all = [...myBusy, ...theirBusy];
  return !all.some((b) => b.start < slotEnd && b.end > slotStart);
};

export type ConfirmMatchParams = {
  opponentId: string;
  slotStart: Date;
  slotEnd: Date;
};

export type ConfirmMatchResult = {
  matchId: string;
  calendarEventId: string | null;
  calendarDenied: boolean;
};

export const confirmMatch = async (
  params: ConfirmMatchParams,
): Promise<ConfirmMatchResult> => {
  const { opponentId, slotStart, slotEnd } = params;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const myId = session.user.id;

  // Re-validate: fetch both users' busy intervals for the slot window
  const [myResult, theirResult] = await Promise.all([
    supabase
      .from('availability_blocks')
      .select('start_time, end_time')
      .eq('user_id', myId)
      .lt('start_time', slotEnd.toISOString())
      .gt('end_time', slotStart.toISOString()),
    supabase.rpc('get_player_availability', {
      player_id: opponentId,
      from_time: slotStart.toISOString(),
      to_time: slotEnd.toISOString(),
    }),
  ]);

  if (myResult.error) throw new Error(myResult.error.message);
  if (theirResult.error) throw new Error(theirResult.error.message);

  const myBusy: BusyInterval[] = (myResult.data ?? []).map((b) => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));
  const theirBusy: BusyInterval[] = (theirResult.data ?? []).map(
    (b: { start_time: string; end_time: string }) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }),
  );

  if (!isSlotStillFree(myBusy, theirBusy, slotStart, slotEnd)) {
    throw new UserFacingError('That slot is no longer free');
  }

  // Insert match record
  const { data: match, error: insertError } = await supabase
    .from('matches')
    .insert({
      player_a: myId,
      player_b: opponentId,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      status: 'upcoming',
    })
    .select('id')
    .single();

  if (insertError || !match)
    throw new Error(insertError?.message ?? 'Insert failed');
  const matchId = match.id;

  // Request calendar write and create event
  let calendarEventId: string | null = null;
  let calendarDenied = false;

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );
      const writable =
        calendars.find((c) => c.allowsModifications) ?? calendars[0];
      if (writable) {
        calendarEventId = await Calendar.createEventAsync(writable.id, {
          title: 'Tennis match – Rally',
          startDate: slotStart,
          endDate: slotEnd,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notes: 'Booked via Rally',
        });
        await supabase
          .from('matches')
          .update({ apple_event_id_a: calendarEventId })
          .eq('id', matchId);
      }
    } else {
      calendarDenied = true;
    }
  } catch {
    calendarDenied = true;
  }

  trackEvent('match_confirmed');

  // Notify opponent (fire and forget — graceful if edge function not deployed)
  void supabase.functions.invoke('notify-match-confirmed', {
    body: { matchId, opponentId },
  });

  return { matchId, calendarEventId, calendarDenied };
};
