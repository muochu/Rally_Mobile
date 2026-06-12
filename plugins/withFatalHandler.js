/* eslint-disable */
/**
 * Config plugin: patches AppDelegate.swift and the bridging header to install
 * a custom RCTSetFatalHandler / RCTSetFatalExceptionHandler before React Native
 * starts. Without this, a void TurboModule method that throws an NSException on
 * iOS 26 causes ObjCTurboModule::performVoidMethodInvocation to rethrow through
 * C++ boundaries → std::terminate → abort(), killing the process before any JS
 * error boundary can display the error.
 */
'use strict';

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BRIDGING_IMPORT = '#import <React/RCTAssert.h>';

const FATAL_HANDLER_SWIFT = `    // Prevent abort() when a void TurboModule method throws on iOS 26.
    // Without this, RCTExceptionsManager.reportFatal calls the default handler
    // which re-throws an NSException through C++ → std::terminate → abort().
    RCTSetFatalHandler { error in
      NSLog("[Rally] RCT fatal caught: %@", error?.localizedDescription ?? "nil")
    }
    RCTSetFatalExceptionHandler { exception in
      NSLog("[Rally] RCT fatal exception caught: %@", exception?.reason ?? "nil")
    }
    `;

module.exports = function withFatalHandler(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const iosDir = path.join(
        config.modRequest.projectRoot,
        'ios',
        config.modRequest.projectName,
      );

      if (!fs.existsSync(iosDir)) return config;

      // 1. Patch bridging header
      const headerPath = path.join(
        iosDir,
        `${config.modRequest.projectName}-Bridging-Header.h`,
      );
      if (fs.existsSync(headerPath)) {
        let header = fs.readFileSync(headerPath, 'utf-8');
        if (!header.includes(BRIDGING_IMPORT)) {
          header += `\n${BRIDGING_IMPORT}\n`;
          fs.writeFileSync(headerPath, header);
        }
      }

      // 2. Patch AppDelegate.swift
      const delegatePath = path.join(iosDir, 'AppDelegate.swift');
      if (fs.existsSync(delegatePath)) {
        let delegate = fs.readFileSync(delegatePath, 'utf-8');
        const marker = 'factory.startReactNative(';
        if (
          !delegate.includes('RCTSetFatalHandler') &&
          delegate.includes(marker)
        ) {
          delegate = delegate.replace(
            marker,
            FATAL_HANDLER_SWIFT + '    ' + marker,
          );
          fs.writeFileSync(delegatePath, delegate);
        }
      }

      return config;
    },
  ]);
};
