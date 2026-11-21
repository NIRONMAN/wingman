import { create } from 'zustand';
import { ConnectionMethod, HardwarePermissions, SettingsState } from '../types/settings';

interface SettingsStore extends SettingsState {
  setServerUrl: (url: string) => void;
  setAuthToken: (token: string) => void;
  setAutoConnect: (auto: boolean) => void;
  setConnectionMethod: (method: ConnectionMethod) => void;
  setPermission: (key: keyof HardwarePermissions, value: boolean) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  resetDefaults: () => void;
}

const DEFAULT_PERMISSIONS: HardwarePermissions = {
  allowCamera: true,
  allowLocation: true,
  allowFlashlight: true,
  allowNotifications: true,
  allowClipboard: true,
  allowSimulatedCalls: true,
  allowHaptics: true,
  allowAlarmsAndReminders: true,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  serverUrl: 'wss://hermes-ws.nironman.com',
  authToken: '',
  autoConnect: true,
  connectionMethod: 'tui_gateway',
  theme: 'dark',
  permissions: { ...DEFAULT_PERMISSIONS },

  setServerUrl: (serverUrl) => set({ serverUrl }),
  setAuthToken: (authToken) => set({ authToken }),
  setAutoConnect: (autoConnect) => set({ autoConnect }),
  setConnectionMethod: (connectionMethod) => set({ connectionMethod }),
  setPermission: (key, value) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        [key]: value,
      },
    })),
  setTheme: (theme) => set({ theme }),
  resetDefaults: () =>
    set({
      serverUrl: 'wss://hermes-ws.nironman.com',
      authToken: '',
      autoConnect: true,
      connectionMethod: 'tui_gateway',
      permissions: { ...DEFAULT_PERMISSIONS },
      theme: 'dark',
    }),
}));
