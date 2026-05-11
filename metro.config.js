// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname);

// eslint-disable-next-line no-undef
module.exports = config;
