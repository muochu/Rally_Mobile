import { describe, expect, it } from 'vitest';

describe('env', () => {
  it('loads and validates required environment variables', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'google-web-id';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'google-ios-id';
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'pk.test-token';
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc123@o0.ingest.sentry.io/0';

    const { env } = await import('@/lib/env');

    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(env.EXPO_PUBLIC_MAPBOX_TOKEN).toMatch(/^pk\./);
  });
});
