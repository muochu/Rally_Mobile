import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';
import { Alert } from 'react-native';
import { z } from 'zod';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

const ProfileRowSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
});

export type MatchWithOpponent = {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentAvatarUrl: string | null;
  startTime: Date;
  endTime: Date;
  status: 'upcoming' | 'completed' | 'cancelled';
  myCalEventId: string | null;
  hasMyReview: boolean;
  scheduleRequestId: string | null;
};

export type PendingRequest = {
  id: string;
  role: 'incoming' | 'outgoing';
  opponentId: string;
  opponentName: string;
  opponentAvatarUrl: string | null;
  createdAt: Date;
  expiresAt: Date;
  message: string | null;
  proposedStart: Date | null;
  proposedEnd: Date | null;
};

type MatchesResult = {
  upcoming: MatchWithOpponent[];
  past: MatchWithOpponent[];
  pending: PendingRequest[];
};

const fetchMatchesData = async (): Promise<MatchesResult> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { upcoming: [], past: [], pending: [] };
  const myId = session.user.id;

  const [matchesAResult, matchesBResult, reviewsResult, requestsResult] =
    await Promise.all([
      supabase.from('matches').select('*').eq('player_a', myId),
      supabase.from('matches').select('*').eq('player_b', myId),
      supabase.from('match_reviews').select('match_id').eq('reviewer_id', myId),
      supabase
        .from('schedule_requests')
        .select('*')
        .or(`requester_id.eq.${myId},recipient_id.eq.${myId}`)
        .eq('status', 'pending'),
    ]);

  const allMatches = [
    ...(matchesAResult.data ?? []),
    ...(matchesBResult.data ?? []),
  ];
  const myReviewedMatchIds = new Set(
    (reviewsResult.data ?? []).map((r) => r.match_id),
  );
  const pendingRequests = requestsResult.data ?? [];

  const opponentIds = new Set([
    ...allMatches.map((m) => (m.player_a === myId ? m.player_b : m.player_a)),
    ...pendingRequests.map((r) =>
      r.requester_id === myId ? r.recipient_id : r.requester_id,
    ),
  ]);

  const profilesResult =
    opponentIds.size > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', [...opponentIds])
      : {
          data: [] as {
            id: string;
            full_name: string;
            avatar_url: string | null;
          }[],
        };

  const profileRows = z
    .array(ProfileRowSchema)
    .parse(profilesResult.data ?? []);
  const profileMap = new Map(profileRows.map((p) => [p.id, p]));

  const nowDate = new Date();

  const toMatch = (m: (typeof allMatches)[0]): MatchWithOpponent => {
    const opponentId = m.player_a === myId ? m.player_b : m.player_a;
    const profile = profileMap.get(opponentId);
    return {
      id: m.id,
      opponentId,
      opponentName: profile?.full_name ?? 'Unknown player',
      opponentAvatarUrl: profile?.avatar_url ?? null,
      startTime: new Date(m.start_time),
      endTime: new Date(m.end_time),
      status: m.status,
      myCalEventId:
        m.player_a === myId ? m.apple_event_id_a : m.apple_event_id_b,
      hasMyReview: myReviewedMatchIds.has(m.id),
      scheduleRequestId: m.schedule_request_id,
    };
  };

  const upcoming = allMatches
    .filter((m) => m.status === 'upcoming' && new Date(m.end_time) > nowDate)
    .map(toMatch)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const past = allMatches
    .filter(
      (m) =>
        m.status === 'completed' ||
        m.status === 'cancelled' ||
        (m.status === 'upcoming' && new Date(m.end_time) <= nowDate),
    )
    .map(toMatch)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  const pending = pendingRequests.map((r) => {
    const opponentId =
      r.requester_id === myId ? r.recipient_id : r.requester_id;
    const profile = profileMap.get(opponentId);
    return {
      id: r.id,
      role: (r.requester_id === myId ? 'outgoing' : 'incoming') as
        | 'incoming'
        | 'outgoing',
      opponentId,
      opponentName: profile?.full_name ?? 'Unknown player',
      opponentAvatarUrl: profile?.avatar_url ?? null,
      createdAt: new Date(r.created_at),
      expiresAt: new Date(r.expires_at),
      message: r.message,
      proposedStart: r.proposed_start ? new Date(r.proposed_start) : null,
      proposedEnd: r.proposed_end ? new Date(r.proposed_end) : null,
    };
  });

  return { upcoming, past, pending };
};

type MatchUpdatePayload = {
  status: string;
  cancelled_by: string | null;
};

export const useMatches = (): ReturnType<typeof useQuery<MatchesResult>> => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let myId: string | null = null;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      myId = session?.user.id ?? null;
    });

    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as MatchUpdatePayload;
          if (
            updated.status === 'cancelled' &&
            myId !== null &&
            updated.cancelled_by !== myId
          ) {
            Alert.alert(
              'Match cancelled',
              'Your opponent cancelled this match.',
            );
          }
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_requests' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
      )
      .subscribe();

    return (): void => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatchesData,
    staleTime: 30_000,
  });
};

export const cancelMatch = async (
  matchId: string,
  calEventId: string | null,
): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  await supabase
    .from('matches')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: session.user.id,
    })
    .eq('id', matchId);

  if (calEventId) {
    try {
      await Calendar.deleteEventAsync(calEventId);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { context: 'cancel_match_calendar_delete' },
      });
    }
  }
};

export const markMatchComplete = async (matchId: string): Promise<void> => {
  await supabase
    .from('matches')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  trackEvent('match_completed');
};

export const submitReview = async (
  matchId: string,
  rating: number,
  noShow: boolean,
): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('match_reviews').insert({
    match_id: matchId,
    reviewer_id: session.user.id,
    rating,
    no_show: noShow,
  });
};

export const declineRequest = async (requestId: string): Promise<void> => {
  await supabase
    .from('schedule_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId);
};

export const cancelRequest = async (requestId: string): Promise<void> => {
  await supabase
    .from('schedule_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
};
