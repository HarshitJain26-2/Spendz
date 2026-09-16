const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable .wasm asset resolution for expo-sqlite web support
config.resolver.assetExts.push('wasm');

// Add cross-origin isolation headers required for SharedArrayBuffer / expo-sqlite on web
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
