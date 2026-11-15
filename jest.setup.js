/* eslint-disable no-undef */
// Setup file for Jest tests in React Native environment
global.__DEV__ = true;

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    useSafeAreaInsets: () => inset,
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((_, callback) =>
    callback({ assets: [{ base64: 'mock_base64_data', width: 640, height: 480 }] })
  ),
  launchImageLibrary: jest.fn((_, callback) =>
    callback({ assets: [{ base64: 'mock_base64_data', width: 640, height: 480 }] })
  ),
}));
