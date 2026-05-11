import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/lib/env';
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

const getRedirectUri = (): string =>
  AuthSession.makeRedirectUri({ scheme: 'rally', path: 'oauth' });

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
      client_id: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }).toString(),
  });

  if (!res.ok) {
    await disconnectGoogleCalendar();
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
    clientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) return false;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: result.params.code,
      client_id: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: request.codeVerifier ?? '',
    }).toString(),
  });

  if (!res.ok) return false;

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
  await Promise.all([
    SecureStore.deleteItemAsync(STORE.accessToken),
    SecureStore.deleteItemAsync(STORE.refreshToken),
    SecureStore.deleteItemAsync(STORE.expiry),
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

  if (!res.ok) return [];

  const data = (await res.json()) as FreeBusyResponse;
  return (data.calendars.primary?.busy ?? []).map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
};
