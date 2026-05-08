import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export const routeAfterAuth = async (
  userId: string,
  router: ReturnType<typeof useRouter>,
): Promise<void> => {
  const { data } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', userId)
    .single();
  if (data?.city) {
    router.replace('/(tabs)/hub');
  } else {
    router.replace('/(onboarding)/step-1-gender');
  }
};
