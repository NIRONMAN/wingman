const fs = require('fs');
const path = require('path');

// When users run `pnpm dlx expo` instead of `pnpm expo`, pnpm downloads the latest
// Expo CLI (v58+) from npm rather than using local Expo SDK 52.
// Expo CLI 58 attempts to resolve `expo/src/async-require/hmr.ts`.
// In Expo SDK 52, that file does not exist, causing Metro bundling to fail on device.
// This script creates a compatibility stub so that both `pnpm dlx expo` and local `pnpm expo` work seamlessly.
const hmrDir = path.join(__dirname, '..', 'node_modules', 'expo', 'src', 'async-require');
const hmrFile = path.join(hmrDir, 'hmr.ts');

try {
  if (fs.existsSync(path.join(__dirname, '..', 'node_modules', 'expo'))) {
    fs.mkdirSync(hmrDir, { recursive: true });
    if (!fs.existsSync(hmrFile)) {
      fs.writeFileSync(
        hmrFile,
        "// Compatibility stub for Expo CLI (dlx)\n// @ts-ignore\nimport HMRClient from 'react-native/Libraries/Utilities/HMRClient';\nexport default HMRClient;\n"
      );
      console.log('[postinstall] Created expo/src/async-require/hmr.ts compatibility shim.');
    }
  }
} catch (err) {
  console.warn('[postinstall] Warning: Could not create expo hmr compatibility shim:', err.message);
}
