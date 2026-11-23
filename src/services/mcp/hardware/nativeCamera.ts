import { Platform, PermissionsAndroid } from 'react-native';

export interface CameraSnapshotResult {
  base64Data: string;
  uri?: string;
  mimeType: string;
  width: number;
  height: number;
  cameraType: 'back' | 'front';
  timestamp: string;
}

export class NativeCameraService {
  // A tiny valid 1x1 / synthetic JPEG base64 for fallback/testing
  private static readonly SAMPLE_IMAGE_BASE64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  private static async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
      const hasPermission = await PermissionsAndroid.check(permission);
      if (hasPermission) return true;

      const result = await PermissionsAndroid.request(permission, {
        title: 'Wingman Camera Access',
        message: 'Wingman needs camera access so Hermes can capture snapshots and inspect physical items.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  static async captureSnapshot(options?: {
    cameraType?: 'back' | 'front';
    quality?: number;
    includeBase64?: boolean;
  }): Promise<CameraSnapshotResult> {
    const cameraType = options?.cameraType || 'back';
    let base64 = this.SAMPLE_IMAGE_BASE64;
    let uri: string | undefined = undefined;
    let width = 1280;
    let height = 720;
    let mimeType = 'image/jpeg';

    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        console.warn('[NativeCameraService] Camera permission not granted');
      }

      const ImagePicker = require('react-native-image-picker');
      if (ImagePicker?.launchCamera && hasPermission) {
        const response: any = await new Promise((resolve) => {
          ImagePicker.launchCamera(
            {
              mediaType: 'photo',
              cameraType: cameraType,
              includeBase64: true,
              quality: options?.quality || 0.8,
              maxWidth: 1280,
              maxHeight: 1280,
              saveToPhotos: false,
            },
            resolve
          );
        });

        if (response?.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.base64) base64 = asset.base64;
          if (asset.uri) uri = asset.uri;
          if (asset.type) mimeType = asset.type;
          if (asset.width) width = asset.width;
          if (asset.height) height = asset.height;
        } else if (response?.errorMessage) {
          console.warn('[NativeCameraService] launchCamera error:', response.errorMessage);
        }
      }
    } catch (err: any) {
      console.warn('[NativeCameraService] Exception capturing photo:', err?.message || err);
    }

    return {
      base64Data: base64,
      uri,
      mimeType,
      width,
      height,
      cameraType,
      timestamp: new Date().toISOString()
    };
  }
}
