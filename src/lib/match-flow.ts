import * as Calendar from 'expo-calendar';
import { trackEvent } from '@/lib/analytics';
import type { BusyInterval } from '@/lib/calendar/types';
import { reportError, UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export { UserFacingError };

export const isSlotStillFree = (
  myBusy: BusyInterval[],
  theirBusy: BusyInterval[],
  slotStart: Date,
  slotEnd: Date,
): boolean => {
  const all = [...myBusy, ...theirBusy];
  return !all.some((b) => b.start < slotEnd && b.end > slotStart);
};

const assertSlotFree = async (
  myId: string,
  otherId: string,
  slotStart: Date,
  slotEnd: Date,
): Promise<void> => {
  const [myAvailResult, theirAvailResult, myMatchesResult] = await Promise.all([
    supabase
      .from('availability_blocks')
      .select('start_time, end_time')
      .eq('user_id', myId)
      .lt('start_time', slotEnd.toISOString())
      .gt('end_time', slotStart.toISOString()),
    supabase.rpc('get_player_availability', {
      player_id: otherId,
      from_time: slotStart.toISOString(),
      to_time: slotEnd.toISOString(),
    }),
    // Check whether the acceptor already has an upcoming match at this time.
    // availability_blocks may not yet reflect a recently booked match if the
    // calendar sync hasn't run since then — querying matches directly closes that gap.
    supabase
      .from('matches')
      .select('id')
      .or(`player_a.eq.${myId},player_b.eq.${myId}`)
      .eq('status', 'upcoming')
      .lt('start_time', slotEnd.toISOString())
      .gt('end_time', slotStart.toISOString()),
  ]);

  if (myAvailResult.error) throw new Error(myAvailResult.error.message);
  if (theirAvailResult.error) throw new Error(theirAvailResult.error.message);
  if (myMatchesResult.error) throw new Error(myMatchesResult.error.message);

  if ((myMatchesResult.data ?? []).length > 0) {
    throw new UserFacingError(
      'You already have a match scheduled at that time',
    );
  }

  const myBusy: BusyInterval[] = (myAvailResult.data ?? []).map((b) => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));
  const theirBusy: BusyInterval[] = (theirAvailResult.data ?? []).map(
    (b: { start_time: string; end_time: string }) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }),
  );

  if (!isSlotStillFree(myBusy, theirBusy, slotStart, slotEnd)) {
    throw new UserFacingError('That slot is no longer free');
  }
};

const writeCalendarEvent = async (
  slotStart: Date,
  slotEnd: Date,
  matchId: string,
  column: 'apple_event_id_a' | 'apple_event_id_b' = 'apple_event_id_a',
): Promise<{ calendarEventId: string | null; calendarDenied: boolean }> => {
  try {
    const { status } = await Calendar.requestCalendarPermissions();
    if (status !== 'granted')
      return { calendarEventId: null, calendarDenied: true };
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    const writable =
      calendars.find((c) => c.allowsModifications) ?? calendars[0];
    // No writable calendar found — treat same as denied so the UI shows a warning
    if (!writable) return { calendarEventId: null, calendarDenied: true };
    const calendarEventId = await Calendar.createEventAsync(writable.id, {
      title: 'Tennis match – Rally',
      startDate: slotStart,
      endDate: slotEnd,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: 'Booked via Rally',
    });
    await supabase
      .from('matches')
      .update({ [column]: calendarEventId })
      .eq('id', matchId);
    return { calendarEventId, calendarDenied: false };
  } catch {
    return { calendarEventId: null, calendarDenied: true };
  }
};

export const addMissingCalendarEvent = async (
  matchId: string,
  slotStart: Date,
  slotEnd: Date,
  column: 'apple_event_id_a' | 'apple_event_id_b',
): Promise<void> => {
  await writeCalendarEvent(slotStart, slotEnd, matchId, column);
};

export type ConfirmMatchResult = {
  matchId: string;
  calendarEventId: string | null;
  calendarDenied: boolean;
};

export type SendScheduleRequestParams = {
  recipientId: string;
  proposedStart: Date;
  proposedEnd: Date;
};

export const sendScheduleRequest = async (
  params: SendScheduleRequestParams,
): Promise<{ requestId: string }> => {
  const { recipientId, proposedStart, proposedEnd } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Prevent duplicate pending requests for the exact same slot
  const { data: dupe } = await supabase
    .from('schedule_requests')
    .select('id')
    .eq('requester_id', user.id)
    .eq('recipient_id', recipientId)
    .eq('status', 'pending')
    .eq('proposed_start', proposedStart.toISOString())
    .limit(1);
  if (dupe && dupe.length > 0) {
    throw new UserFacingError(
      'You already have a pending request for this time slot',
    );
  }

  const { data: request, error } = await supabase
    .from('schedule_requests')
    .insert({
      requester_id: user.id,
      recipient_id: recipientId,
      proposed_start: proposedStart.toISOString(),
      proposed_end: proposedEnd.toISOString(),
    })
    .select('id')
    .single();

  if (error || !request)
    throw new Error(`schedule_requests insert: ${error?.message ?? 'no data'}`);

  trackEvent('request_sent');
  void supabase.functions.invoke('notify-schedule-request', {
    body: {
      record: {
        id: request.id,
        requester_id: user.id,
        recipient_id: recipientId,
      },
    },
  });

  return { requestId: request.id };
};

export type AcceptScheduleRequestParams = {
  requestId: string;
  requesterId: string;
  slotStart: Date;
  slotEnd: Date;
};

export const acceptScheduleRequest = async (
  params: AcceptScheduleRequestParams,
): Promise<ConfirmMatchResult> => {
  const { requestId, requesterId, slotStart, slotEnd } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const myId = user.id;

  // Read the request status before any write — catches races where another
  // acceptor already responded between the UI fetch and this acceptance.
  const { data: reqRow, error: reqError } = await supabase
    .from('schedule_requests')
    .select('status')
    .eq('id', requestId)
    .single();
  if (reqError || !reqRow) throw new Error('Request not found');
  if (reqRow.status !== 'pending') {
    throw new UserFacingError('This request has already been responded to');
  }

  await assertSlotFree(myId, requesterId, slotStart, slotEnd);

  const { data: match, error: insertError } = await supabase
    .from('matches')
    .insert({
      player_a: myId,
      player_b: requesterId,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      status: 'upcoming',
      schedule_request_id: requestId,
    })
    .select('id')
    .single();

  if (insertError || !match)
    throw new Error(insertError?.message ?? 'Match insert failed');

  // Status update is best-effort: the match row is already committed.
  // Log failures but do not throw — the acceptor should proceed to the success screen.
  const { error: statusError } = await supabase
    .from('schedule_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (statusError) {
    reportError(
      new Error(
        `schedule_requests status update failed: ${statusError.message}`,
      ),
      {
        context: 'acceptScheduleRequest-statusUpdate',
        requestId,
        matchId: match.id,
      },
    );
  }

  const { calendarEventId, calendarDenied } = await writeCalendarEvent(
    slotStart,
    slotEnd,
    match.id,
  );

  trackEvent('request_accepted');
  void supabase.functions.invoke('notify-request-response', {
    body: {
      record: {
        id: requestId,
        requester_id: requesterId,
        recipient_id: myId,
        status: 'accepted',
      },
    },
  });

  return { matchId: match.id, calendarEventId, calendarDenied };
};
