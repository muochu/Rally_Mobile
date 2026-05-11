import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BusyInterval } from '@/lib/calendar/types';
import type { FreeSlot, PreferredHours } from '@/lib/overlap';
import { findMutualFreeSlots, sliceToMatchSlots } from '@/lib/overlap';
import { supabase } from '@/lib/supabase';

const LOOKAHEAD_DAYS = 14;
const MIN_MATCH_MINUTES = 90;

export interface NearbyPlayerWithSlots {
  id: string;
  full_name: string;
  avatar_url: string | null;
  utr_rating: number | null;
  city: string | null;
  home_court_name: string | null;
  distance_km: number | null;
  overlap_count: number;
  mutual_slots: FreeSlot[];
}

export const useNearbyPlayers = (
  userId: string | undefined,
  myBusy: BusyInterval[],
  preferred?: PreferredHours | null,
): {
  players: NearbyPlayerWithSlots[];
  isLoading: boolean;
} => {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['nearby-players', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nearby_players', {
        radius_km: 50,
        lookahead_days: LOOKAHEAD_DAYS,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(userId),
  });

  const players = useMemo((): NearbyPlayerWithSlots[] => {
    if (!raw) return [];

    return raw
      .map((p) => {
        const theirBusy: BusyInterval[] = (p.busy_intervals ?? []).map(
          (b: { start_time: string; end_time: string }) => ({
            start: new Date(b.start_time),
            end: new Date(b.end_time),
          }),
        );

        const windows = findMutualFreeSlots(myBusy, theirBusy, {
          lookaheadDays: LOOKAHEAD_DAYS,
          minDurationMinutes: MIN_MATCH_MINUTES,
        });
        const mutual_slots = sliceToMatchSlots(windows, preferred);
        const uniqueDays = new Set(
          mutual_slots.map((s) => {
            const d = s.start;
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          }),
        ).size;

        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          utr_rating: p.utr_rating,
          city: p.city,
          home_court_name: p.home_court_name,
          distance_km: p.distance_km,
          overlap_count: uniqueDays,
          mutual_slots,
        };
      })
      .sort((a, b) => b.overlap_count - a.overlap_count);
  }, [raw, myBusy, preferred]);

  return { players, isLoading };
};
