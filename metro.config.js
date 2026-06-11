/* eslint-disable */
const { getDefaultConfig } = require('expo/metro-config');
const {
  getBundleModeMetroConfig,
} = require('react-native-worklets/bundleMode');

const config = getDefaultConfig(__dirname);

module.exports = getBundleModeMetroConfig(config);
