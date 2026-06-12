/* eslint-disable */
/**
 * Pre-generates react-native-worklets bundle mode files before Metro starts.
 *
 * Bundle mode works by having the Babel plugin transform worklet functions
 * into separate .worklets/<hash>.js files, then Metro includes them as
 * normal modules (avoiding runtime BCProviderFromSrc calls).
 *
 * Problem: Babel writes these files during Metro's transform phase, but Metro
 * snapshots the filesystem at startup and can't hash newly-created files.
 *
 * Fix: Run Babel on source files here (before Metro starts) to pre-populate
 * the .worklets/ directory so Metro finds them on startup.
 */
'use strict';

const babel = require('@babel/core');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const BABELRC = path.join(ROOT, 'babel.config.js');

function walkDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const skip = new Set([
    'node_modules',
    '.git',
    '.expo',
    'android',
    'ios',
    '__tests__',
  ]);
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name))
          results.push(...walkDir(path.join(dir, entry.name), extensions));
      } else if (
        entry.isFile() &&
        extensions.some((ext) => entry.name.endsWith(ext))
      ) {
        results.push(path.join(dir, entry.name));
      }
    }
  } catch (_) {}
  return results;
}

const workletsDir = path.join(
  ROOT,
  'node_modules/react-native-worklets/.worklets',
);

// Ensure the .worklets directory exists — npm install does NOT create it,
// and the Babel plugin's writeFileSync will throw ENOENT without it.
fs.mkdirSync(workletsDir, { recursive: true });

const NM = path.join(ROOT, 'node_modules');

const filesToTransform = [
  ...walkDir(path.join(ROOT, 'src')),
  ...walkDir(path.join(NM, 'react-native-reanimated/src')),
  ...walkDir(path.join(NM, 'react-native-reanimated/lib/module'), ['.js']),
  ...walkDir(path.join(NM, 'react-native-worklets/src')),
  ...walkDir(path.join(NM, 'react-native-worklets/lib/module'), ['.js']),
  ...walkDir(path.join(NM, 'react-native-gesture-handler/src')),
  ...walkDir(path.join(NM, 'react-native-gesture-handler/lib/module'), ['.js']),
  ...walkDir(path.join(NM, 'react-native-screens/src')),
  ...walkDir(path.join(NM, 'react-native-screens/lib/module'), ['.js']),
  ...walkDir(path.join(NM, 'react-native-drawer-layout/src')),
  ...walkDir(path.join(NM, 'react-native-drawer-layout/lib/module'), ['.js']),
  ...walkDir(path.join(NM, '@expo/ui/src')),
  ...walkDir(path.join(NM, '@expo/ui/build'), ['.js']),
];

let transformed = 0;
let errors = 0;

// Mimic Metro's Babel caller so class-property transforms are skipped for
// Hermes (which supports class fields natively). Without this, TypeScript
// class fields get hoisted to the constructor, changing the worklet
// traversal order and producing different content hashes than Metro generates.
const METRO_CALLER = {
  name: 'metro',
  bundler: 'metro',
  platform: 'ios',
  isDev: false,
  isServer: false,
  isReactServer: false,
  isHMREnabled: false,
  projectRoot: ROOT,
  routerRoot: 'app',
  supportsStaticESM: false,
  engine: 'hermes',
};

for (const file of filesToTransform) {
  try {
    babel.transformFileSync(file, {
      configFile: BABELRC,
      cwd: ROOT,
      filename: file,
      caller: {
        ...METRO_CALLER,
        isNodeModule: file.includes('/node_modules/'),
      },
    });
    transformed++;
  } catch (_) {
    errors++;
  }
}

let workletFiles = fs.readdirSync(workletsDir).filter((f) => f.endsWith('.js'));

// Copy to a visible project-root directory so Metro/watchman can hash the files.
// node_modules/react-native-worklets/.worklets is a hidden dot-directory that
// watchman won't crawl; _rn_worklets at the project root has no such restriction.
const visibleDir = path.join(ROOT, '_rn_worklets');
fs.mkdirSync(visibleDir, { recursive: true });
for (const file of workletFiles) {
  fs.copyFileSync(path.join(workletsDir, file), path.join(visibleDir, file));
}

// Second pass: Metro transforms worklet files themselves (from _rn_worklets/) using
// their visible path. The Babel plugin may find nested worklet calls inside those
// files and extract them as new worklet files. Run until no new files appear.
// Root cause: toIdentifier('9093088135464.js1') === 'js1', so worklet files at
// _rn_worklets/<hash>.js generate factory names like 'js1Factory' when re-processed.
let pass = 0;
let prevCount = workletFiles.length;
do {
  prevCount = workletFiles.length;
  for (const file of workletFiles) {
    const visiblePath = path.join(visibleDir, file);
    try {
      babel.transformFileSync(visiblePath, {
        configFile: BABELRC,
        cwd: ROOT,
        filename: visiblePath,
        caller: { ...METRO_CALLER, isNodeModule: false },
      });
    } catch (_) {}
  }
  workletFiles = fs.readdirSync(workletsDir).filter((f) => f.endsWith('.js'));
  // Copy any newly generated files to _rn_worklets/
  for (const file of workletFiles) {
    const dest = path.join(visibleDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(workletsDir, file), dest);
    }
  }
  pass++;
} while (workletFiles.length > prevCount && pass < 5);

console.log(
  `[worklets prebuild] Transformed ${transformed} files (${errors} skipped), ${workletFiles.length} worklet files → _rn_worklets/ (${pass} nested pass${pass === 1 ? '' : 'es'}).`,
);
