/* eslint-disable */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo's production config sets inlineRequires: true which breaks Expo Router's
// require.context — route modules appear undefined at SceneView render time.
// Safe to force false because we don't use worklets bundle mode.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

module.exports = config;
