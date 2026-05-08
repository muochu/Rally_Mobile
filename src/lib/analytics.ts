export const trackEvent = (
  _eventName:
    | 'signed_up'
    | 'onboarding_completed'
    | 'calendar_connected'
    | 'first_availability_synced'
    | 'request_sent'
    | 'request_accepted'
    | 'match_confirmed'
    | 'match_completed',
  _properties?: Record<string, unknown>,
): void => {
  return;
};
