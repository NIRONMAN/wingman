const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (
      moduleName === 'expo/src/async-require/hmr.ts' ||
      moduleName === 'expo/src/async-require/hmr'
    ) {
      return {
        filePath: require.resolve('react-native/Libraries/Utilities/HMRClient.js'),
        type: 'sourceFile',
      };
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;

