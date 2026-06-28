import { z } from 'zod';

import { supabase } from '@/lib/supabase';

export type MatchDetail = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: 'upcoming' | 'completed' | 'cancelled';
  opponentName: string;
  opponentId: string;
  courtName: string | null;
  courtAddress: string | null;
  courtLat: number | null;
  courtLng: number | null;
  myCalEventId: string | null;
  calEventColumn: 'apple_event_id_a' | 'apple_event_id_b';
  hasMyReview: boolean;
};

const MatchRowSchema = z.object({
  id: z.string(),
  player_a: z.string(),
  player_b: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['upcoming', 'completed', 'cancelled']),
  apple_event_id_a: z.string().nullable(),
  apple_event_id_b: z.string().nullable(),
  courts: z
    .object({
      name: z.string(),
      address: z.string().nullable(),
      latitude: z.number(),
      longitude: z.number(),
    })
    .nullable(),
});

const ProfileRowSchema = z.object({ full_name: z.string() });

export const fetchMatchDetail = async (
  id: string,
): Promise<MatchDetail | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const myId = session.user.id;

  const [{ data: raw }, { data: reviews }] = await Promise.all([
    supabase
      .from('matches')
      .select('*, courts(name, address, latitude, longitude)')
      .eq('id', id)
      .single(),
    supabase
      .from('match_reviews')
      .select('id')
      .eq('match_id', id)
      .eq('reviewer_id', myId)
      .limit(1),
  ]);

  if (!raw) return null;

  const parsed = MatchRowSchema.safeParse(raw);
  if (!parsed.success) return null;
  const match = parsed.data;
  const isPlayerA = match.player_a === myId;
  const opponentId = isPlayerA ? match.player_b : match.player_a;

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', opponentId)
    .single();

  const profile = profileRaw ? ProfileRowSchema.parse(profileRaw) : null;
  const court = match.courts;

  return {
    id: match.id,
    startTime: new Date(match.start_time),
    endTime: new Date(match.end_time),
    status: match.status,
    opponentName: profile?.full_name ?? 'Unknown player',
    opponentId,
    courtName: court?.name ?? null,
    courtAddress: court?.address ?? null,
    courtLat: court?.latitude ?? null,
    courtLng: court?.longitude ?? null,
    myCalEventId: isPlayerA ? match.apple_event_id_a : match.apple_event_id_b,
    calEventColumn: isPlayerA ? 'apple_event_id_a' : 'apple_event_id_b',
    hasMyReview: (reviews ?? []).length > 0,
  };
};
