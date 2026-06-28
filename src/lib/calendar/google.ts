import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { env } from '@/lib/env';
import { reportError, UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import type { BusyInterval } from './types';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const STORE = {
  accessToken: 'google_access_token',
  refreshToken: 'google_refresh_token',
  expiry: 'google_token_expiry',
} as const;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

type FreeBusyResponse = {
  calendars: {
    primary?: { busy: { start: string; end: string }[] };
  };
};

// Google's iOS OAuth client type requires the redirect URI scheme to be the
// reversed client ID (e.g. com.googleusercontent.apps.123-abc) — any other
// custom scheme is rejected with "doesn't comply with Google's OAuth 2.0 policy".
const getRedirectUri = (): string => {
  const reversedClientId = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.replace(
    /^(.+)\.apps\.googleusercontent\.com$/,
    'com.googleusercontent.apps.$1',
  );
  return `${reversedClientId}:/oauth2redirect`;
};

const getValidAccessToken = async (): Promise<string | null> => {
  const [token, refresh, expiryStr] = await Promise.all([
    SecureStore.getItemAsync(STORE.accessToken),
    SecureStore.getItemAsync(STORE.refreshToken),
    SecureStore.getItemAsync(STORE.expiry),
  ]);

  if (!token || !refresh) return null;

  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
  if (Date.now() < expiry - 60_000) return token;

  // Refresh expired token
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }).toString(),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      await disconnectGoogleCalendar();
    }
    return null;
  }

  const tokens = (await res.json()) as TokenResponse;
  const newExpiry = Date.now() + tokens.expires_in * 1000;
  await Promise.all([
    SecureStore.setItemAsync(STORE.accessToken, tokens.access_token),
    SecureStore.setItemAsync(STORE.expiry, String(newExpiry)),
  ]);
  return tokens.access_token;
};

export const connectGoogleCalendar = async (): Promise<boolean> => {
  const redirectUri = getRedirectUri();
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: GOOGLE_TOKEN_URL,
  };

  const request = new AuthSession.AuthRequest({
    clientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss') return false;
  if (result.type !== 'success' || !result.params.code) {
    reportError(new Error('Google calendar OAuth did not return a code'), {
      context: 'connectGoogleCalendar-prompt',
      resultType: result.type,
      error: result.type === 'error' ? result.error?.message : undefined,
    });
    throw new UserFacingError('Could not connect to Google Calendar. Please try again.');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: result.params.code,
      client_id: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: request.codeVerifier ?? '',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    reportError(new Error(`Google token exchange failed: ${res.status}`), {
      context: 'connectGoogleCalendar-tokenExchange',
      status: res.status,
      body,
    });
    throw new UserFacingError('Could not connect to Google Calendar. Please try again.');
  }

  const tokens = (await res.json()) as TokenResponse;
  const expiry = Date.now() + tokens.expires_in * 1000;

  await Promise.all([
    SecureStore.setItemAsync(STORE.accessToken, tokens.access_token),
    tokens.refresh_token
      ? SecureStore.setItemAsync(STORE.refreshToken, tokens.refresh_token)
      : Promise.resolve(),
    SecureStore.setItemAsync(STORE.expiry, String(expiry)),
  ]);

  return true;
};

export const disconnectGoogleCalendar = async (): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await Promise.all([
    SecureStore.deleteItemAsync(STORE.accessToken),
    SecureStore.deleteItemAsync(STORE.refreshToken),
    SecureStore.deleteItemAsync(STORE.expiry),
    session
      ? supabase
          .from('availability_blocks')
          .delete()
          .eq('user_id', session.user.id)
          .eq('source', 'google')
      : Promise.resolve(),
  ]);
};

export const isGoogleCalendarConnected = async (): Promise<boolean> => {
  const token = await SecureStore.getItemAsync(STORE.refreshToken);
  return token !== null;
};

export const getGoogleBusyIntervals = async (
  lookaheadDays = 14,
): Promise<BusyInterval[]> => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];

  const timeMin = new Date().toISOString();
  const timeMax = new Date(
    Date.now() + lookaheadDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const res = await fetch(FREEBUSY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
  });

  if (!res.ok) {
    reportError(new Error(`getGoogleBusyIntervals: HTTP ${res.status}`), {
      context: 'getGoogleBusyIntervals',
      status: res.status,
    });
    return [];
  }

  const data = (await res.json()) as FreeBusyResponse;
  return (data.calendars.primary?.busy ?? []).map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
};
