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
        // Prevent native packages from being loaded in Node test env
        inline: ['posthog-react-native'],
      },
    },
  },
});
