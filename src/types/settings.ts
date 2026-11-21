export interface HardwarePermissions {
  allowCamera: boolean;
  allowLocation: boolean;
  allowFlashlight: boolean;
  allowNotifications: boolean;
  allowClipboard: boolean;
  allowSimulatedCalls: boolean;
  allowHaptics: boolean;
  allowAlarmsAndReminders: boolean;
}

export type ConnectionMethod = 'tui_gateway' | 'mock';

export interface SettingsState {
  serverUrl: string;
  authToken: string;
  autoConnect: boolean;
  connectionMethod: ConnectionMethod;
  permissions: HardwarePermissions;
  theme: 'dark' | 'light' | 'system';
}
