import PostHog from 'posthog-react-native';

import { env } from '@/lib/env';

type EventName =
  | 'signed_up'
  | 'onboarding_completed'
  | 'calendar_connected'
  | 'first_availability_synced'
  | 'request_sent'
  | 'request_accepted'
  | 'match_confirmed'
  | 'match_completed';

let client: PostHog | null = null;

export const initAnalytics = (): void => {
  if (!env.EXPO_PUBLIC_POSTHOG_KEY) return;
  client = new PostHog(env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: 'https://us.i.posthog.com',
  });
};

export const identifyUser = (userId: string): void => {
  client?.identify(userId);
};

export const trackEvent = (
  eventName: EventName,
  properties?: Record<string, string | number | boolean>,
): void => {
  client?.capture(eventName, properties);
};

export const resetAnalytics = (): void => {
  client?.reset();
};
