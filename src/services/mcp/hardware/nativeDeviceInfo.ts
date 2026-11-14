import { Platform } from 'react-native';

export interface DeviceTelemetryData {
  batteryLevel: number;
  isCharging: boolean;
  networkType: string;
  isConnected: boolean;
  systemName: string;
  systemVersion: string;
  deviceModel: string;
  isEmulator: boolean;
  uptimeSeconds: number;
  timestamp: string;
}

export class NativeDeviceInfoService {
  static async getTelemetry(): Promise<DeviceTelemetryData> {
    let batteryLevel = 0.85;
    let isCharging = false;
    let networkType = 'wifi';
    let isConnected = true;
    let systemName = Platform.OS;
    let systemVersion = String(Platform.Version);
    let deviceModel = Platform.select({ ios: 'iPhone Simulator', android: 'Android Pixel', default: 'Mobile Device' }) || 'Mobile Device';
    let isEmulator = false;
    let uptimeSeconds = 3600;

    // Try react-native-device-info
    try {
      const DeviceInfo = require('react-native-device-info');
      if (DeviceInfo) {
        if (typeof DeviceInfo.getBatteryLevel === 'function') {
          const level = await DeviceInfo.getBatteryLevel();
          if (level >= 0) batteryLevel = Math.round(level * 100) / 100;
        }
        if (typeof DeviceInfo.isBatteryCharging === 'function') {
          isCharging = await DeviceInfo.isBatteryCharging();
        }
        if (typeof DeviceInfo.getModel === 'function') {
          deviceModel = DeviceInfo.getModel();
        }
        if (typeof DeviceInfo.isEmulator === 'function') {
          isEmulator = await DeviceInfo.isEmulator();
        }
        if (typeof DeviceInfo.getSystemVersion === 'function') {
          systemVersion = DeviceInfo.getSystemVersion();
        }
        if (typeof DeviceInfo.getSystemName === 'function') {
          systemName = DeviceInfo.getSystemName();
        }
      }
    } catch {
      // Mock / fallback
    }

    // Try @react-native-community/netinfo
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      if (NetInfo?.fetch) {
        const netState = await NetInfo.fetch();
        networkType = netState.type || 'wifi';
        isConnected = Boolean(netState.isConnected);
      }
    } catch {
      // Netinfo fallback
    }

    return {
      batteryLevel: Math.round(batteryLevel * 100),
      isCharging,
      networkType,
      isConnected,
      systemName,
      systemVersion,
      deviceModel,
      isEmulator,
      uptimeSeconds,
      timestamp: new Date().toISOString()
    };
  }
}
