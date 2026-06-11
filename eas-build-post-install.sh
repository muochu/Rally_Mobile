#!/bin/bash
# Pre-generate react-native-worklets bundle mode files.
# Metro snapshots the filesystem at startup and cannot hash .worklets/*.js files
# that the Babel plugin creates mid-bundle. This script runs Babel directly
# (no Metro/Expo) to pre-populate .worklets/ before the Xcode build phase.
echo "[worklets] Starting bundle mode pre-generation pass..."
node scripts/prebuild-worklets.js
echo "[worklets] Pre-generation complete."
