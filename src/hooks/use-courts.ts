import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Court = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  court_count: number;
  fee_per_hour_cents: number | null;
  surface: string | null;
  indoor: boolean;
  upcoming_matches_count: number;
};

export type TrafficState = 'open' | 'filling' | 'full';

export type Bounds = {
  sw: [number, number]; // [lng, lat]
  ne: [number, number]; // [lng, lat]
};

export const getTrafficState = (count: number): TrafficState => {
  if (count >= 2) return 'full';
  if (count === 1) return 'filling';
  return 'open';
};

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useCourts = (
  bounds: Bounds | null,
): { courts: Court[]; isLoading: boolean; error: Error | null } => {
  const { data, isLoading, error } = useQuery<Court[], Error>({
    queryKey: ['courts', bounds],
    queryFn: async () => {
      if (!bounds) return [];
      const { data: rows, error: rpcError } = await supabase.rpc(
        'get_courts_in_bounds',
        {
          sw_lat: bounds.sw[1],
          sw_lng: bounds.sw[0],
          ne_lat: bounds.ne[1],
          ne_lng: bounds.ne[0],
        },
      );
      if (rpcError) throw new Error(rpcError.message);
      // Deduplicate by proximity — same court seeded from multiple OSM ways
      const seen: Court[] = [];
      for (const court of (rows ?? []) as Court[]) {
        const nearby = seen.findIndex(
          (c) =>
            haversineKm(
              c.latitude,
              c.longitude,
              court.latitude,
              court.longitude,
            ) < 0.05,
        );
        if (nearby === -1) {
          seen.push(court);
        } else if (court.court_count > seen[nearby].court_count) {
          seen[nearby] = court;
        }
      }
      return seen;
    },
    enabled: bounds !== null,
    staleTime: 60_000,
  });

  return { courts: data ?? [], isLoading, error: error ?? null };
};

export const setHomeCourt = async (
  userId: string,
  courtId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ home_court_id: courtId })
    .eq('id', userId);
  if (error) throw new Error(error.message);
};
