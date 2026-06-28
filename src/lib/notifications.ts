import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Called explicitly from _layout.tsx after the React tree mounts.
// Kept out of module scope so a native throw on startup can't abort the process.
export const initNotifications = (): void => {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // ignore if notification handler setup fails
  }
};

export const registerForPushNotifications = async (
  userId: string,
): Promise<void> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token) return;
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
  } catch {
    // push token unavailable — app remains functional without notifications
  }
};
