export interface HardwarePermissions {
  allowCamera: boolean;
  allowLocation: boolean;
  allowFlashlight: boolean;
  allowNotifications: boolean;
  allowClipboard: boolean;
  allowSimulatedCalls: boolean;
  allowHaptics: boolean;
}

export interface SettingsState {
  serverUrl: string;
  authToken: string;
  autoConnect: boolean;
  permissions: HardwarePermissions;
  theme: 'dark' | 'light' | 'system';
}
