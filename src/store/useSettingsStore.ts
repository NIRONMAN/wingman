import { create } from 'zustand';
import { HardwarePermissions, SettingsState } from '../types/settings';

interface SettingsStore extends SettingsState {
  setServerUrl: (url: string) => void;
  setAuthToken: (token: string) => void;
  setAutoConnect: (auto: boolean) => void;
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
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  serverUrl: 'ws://127.0.0.1:8765',
  authToken: 'hermes-wingman-token-2026',
  autoConnect: true,
  theme: 'dark',
  permissions: { ...DEFAULT_PERMISSIONS },

  setServerUrl: (serverUrl) => set({ serverUrl }),
  setAuthToken: (authToken) => set({ authToken }),
  setAutoConnect: (autoConnect) => set({ autoConnect }),
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
      serverUrl: 'ws://127.0.0.1:8765',
      authToken: 'hermes-wingman-token-2026',
      autoConnect: true,
      permissions: { ...DEFAULT_PERMISSIONS },
      theme: 'dark',
    }),
}));
