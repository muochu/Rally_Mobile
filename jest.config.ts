import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['**/tests/unit/**/*.test.tsx'],
  setupFiles: ['./tests/setup/jest-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};

export default config;
