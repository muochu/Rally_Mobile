import { z } from 'zod';

export const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_MAPBOX_TOKEN: z.string().startsWith('pk.'),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv): Env =>
  envSchema.parse(source);

export const env: Env = parseEnv(process.env);
