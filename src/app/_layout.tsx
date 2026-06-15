import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastContainer } from '@/components/ui/toast';
import { identifyUser, initAnalytics, resetAnalytics } from '@/lib/analytics';
import { initSentry, wrapWithSentry } from '@/lib/errors';
import {
  initNotifications,
  registerForPushNotifications,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

initSentry();
initNotifications();

void requestTrackingPermissionsAsync().then(() => {
  initAnalytics();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function RootLayout(): ReactElement {
  const router = useRouter();

  useEffect((): (() => void) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        identifyUser(session.user.id);
        void registerForPushNotifications(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        resetAnalytics();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect((): (() => void) => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, string>
          | undefined;
        if (!data?.screen) return;
        router.push(data.screen as Parameters<typeof router.push>[0]);
      },
    );
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="match/[id]" />
          </Stack>
          <ToastContainer />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(RootLayout);
