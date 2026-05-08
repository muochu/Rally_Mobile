import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

export default function IndexScreen(): ReactElement {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect((): void => {
    if (isLoading) return;

    if (!session) {
      router.replace('/(auth)/sign-in');
      return;
    }

    supabase
      .from('profiles')
      .select('city')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.city) {
          router.replace('/(tabs)/hub');
        } else {
          router.replace('/(onboarding)/step-1-gender');
        }
      });
  }, [session, isLoading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
