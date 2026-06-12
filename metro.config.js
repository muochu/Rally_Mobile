/* eslint-disable */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const {
  getBundleModeMetroConfig,
} = require('react-native-worklets/bundleMode');

const config = getDefaultConfig(__dirname);

// Pre-generated worklet files live here; Metro must watch this dir to hash them.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, 'node_modules/react-native-worklets/.worklets'),
];

module.exports = getBundleModeMetroConfig(config);
