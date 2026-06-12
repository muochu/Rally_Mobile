/* eslint-disable */
const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');
const {
  getBundleModeMetroConfig,
} = require('react-native-worklets/bundleMode');

const config = getDefaultConfig(__dirname);

// Apply bundle mode (sets resolver + serializer for worklets)
const finalConfig = getBundleModeMetroConfig(config);

// getBundleModeMetroConfig resolves worklet requires to
// node_modules/react-native-worklets/.worklets/<hash>.js — a hidden directory
// that Metro/watchman cannot hash. We redirect those paths to _rn_worklets/ at
// the project root, which is a plain visible directory Metro watches normally.
const HIDDEN = path.resolve(
  __dirname,
  'node_modules/react-native-worklets/.worklets',
);
const VISIBLE = path.resolve(__dirname, '_rn_worklets');

const bundleModeResolver = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // Worklet files in _rn_worklets/ may contain relative imports (e.g. "../src/foo")
  // that were correct relative to their original .worklets/ location but are wrong
  // when Metro resolves them from _rn_worklets/. Re-anchor origin to .worklets/.
  if (
    context.originModulePath?.startsWith(VISIBLE) &&
    moduleName.startsWith('.')
  ) {
    const correctedOrigin = path.join(
      HIDDEN,
      path.basename(context.originModulePath),
    );
    return context.resolveRequest(
      { ...context, originModulePath: correctedOrigin },
      moduleName,
      platform,
    );
  }

  const result = bundleModeResolver(context, moduleName, platform);
  if (result?.type === 'sourceFile' && result.filePath.startsWith(HIDDEN)) {
    const destPath = path.join(VISIBLE, path.basename(result.filePath));
    // The Babel plugin writes worklet files to .worklets/ during the preceding
    // transform. If a hash is new (prebuild didn't generate it), copy it to
    // _rn_worklets/ so Metro/watchman can track it from this point forward.
    if (!fs.existsSync(destPath) && fs.existsSync(result.filePath)) {
      try {
        fs.copyFileSync(result.filePath, destPath);
      } catch (_) {}
    }
    return { type: 'sourceFile', filePath: destPath };
  }
  return result;
};

// bundleModeCreateModuleIdFactory assigns numeric hash IDs to worklet modules by
// matching paths that include 'react-native-worklets/.worklets'. After our
// redirect the paths contain '_rn_worklets' instead — patch the factory so those
// paths still get hash-based IDs.
const originalFactory = finalConfig.serializer.createModuleIdFactory;
finalConfig.serializer.createModuleIdFactory = () => {
  const getModuleId = originalFactory();
  return (modulePath) => {
    if (
      modulePath.startsWith(VISIBLE + path.sep) ||
      modulePath.startsWith(VISIBLE + '/')
    ) {
      const id = Number(path.basename(modulePath, '.js'));
      if (!isNaN(id)) return id;
    }
    return getModuleId(modulePath);
  };
};

module.exports = finalConfig;
