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
};

const MatchRowSchema = z.object({
  id: z.string(),
  player_a: z.string(),
  player_b: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['upcoming', 'completed', 'cancelled']),
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

  const { data: raw } = await supabase
    .from('matches')
    .select('*, courts(name, address, latitude, longitude)')
    .eq('id', id)
    .single();

  if (!raw) return null;

  const match = MatchRowSchema.parse(raw);
  const opponentId = match.player_a === myId ? match.player_b : match.player_a;

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
  };
};
