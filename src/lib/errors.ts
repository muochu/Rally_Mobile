import * as Sentry from '@sentry/react-native';

import { env } from '@/lib/env';

const PII_KEYS = new Set([
  'email',
  'name',
  'full_name',
  'phone',
  'title',
  'message',
  'calendar',
]);

export const initSentry = (): void => {
  if (!env.EXPO_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        for (const key of PII_KEYS) {
          delete breadcrumb.data[key];
        }
      }
      return breadcrumb;
    },
  });
};

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

const stripPii = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!PII_KEYS.has(key)) result[key] = value;
  }
  return result;
};

export const reportError = (
  error: unknown,
  context?: Record<string, unknown>,
): void => {
  Sentry.captureException(error, {
    extra: context ? stripPii(context) : undefined,
  });
};

export const wrapWithSentry = Sentry.wrap;
