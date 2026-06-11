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

// Include app source and reanimated source (which contains most worklets)
const filesToTransform = [
  ...walkDir(path.join(ROOT, 'src')),
  ...walkDir(path.join(ROOT, 'node_modules/react-native-reanimated/src')),
  ...walkDir(
    path.join(ROOT, 'node_modules/react-native-reanimated/lib/module'),
    ['.js'],
  ),
];

let transformed = 0;
let errors = 0;

for (const file of filesToTransform) {
  try {
    babel.transformFileSync(file, {
      configFile: BABELRC,
      cwd: ROOT,
      filename: file,
    });
    transformed++;
  } catch (_) {
    errors++;
  }
}

const generated = fs
  .readdirSync(workletsDir)
  .filter((f) => f.endsWith('.js')).length;

console.log(
  `[worklets prebuild] Transformed ${transformed} files (${errors} skipped), ${generated} worklet files generated.`,
);
