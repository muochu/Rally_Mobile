import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['dotenv/config'],
    server: {
      deps: {
        inline: ['posthog-react-native'],
        external: [
          /react-native/,
          /@sentry\/react-native/,
          /expo-calendar/,
          /expo-secure-store/,
          /expo-haptics/,
          /expo-notifications/,
          /expo-location/,
          /@rnmapbox\/maps/,
        ],
      },
    },
  },
});
