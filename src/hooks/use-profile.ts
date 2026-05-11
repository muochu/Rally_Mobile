import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export type PreferredHours = {
  weekday_morning: boolean;
  weekday_evening: boolean;
  weekend: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  utr_rating: number | null;
  preferred_sport: string;
  preferred_hours: PreferredHours | null;
  home_court_id: string | null;
};

const ProfileSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  city: z.string().nullable(),
  utr_rating: z.number().nullable(),
  preferred_sport: z.string(),
  preferred_hours: z
    .object({
      weekday_morning: z.boolean(),
      weekday_evening: z.boolean(),
      weekend: z.boolean(),
    })
    .nullable(),
  home_court_id: z.string().nullable(),
});

type ProfileUpdate = {
  full_name?: string;
  city?: string;
  utr_rating?: number | null;
  preferred_hours?: PreferredHours;
  avatar_url?: string;
};

export const useProfile = (
  userId: string | undefined,
): { profile: Profile | null; isLoading: boolean } => {
  const { data, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data: row, error } = await supabase
        .from('profiles')
        .select(
          'id, full_name, avatar_url, city, utr_rating, preferred_sport, preferred_hours, home_court_id',
        )
        .eq('id', userId)
        .single();
      if (error) throw new Error(error.message);
      return ProfileSchema.parse(row) as Profile;
    },
    enabled: Boolean(userId),
  });
  return { profile: data ?? null, isLoading };
};

export const useUpdateProfile = (
  userId: string,
): ((updates: ProfileUpdate) => Promise<void>) => {
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
  return mutateAsync;
};
