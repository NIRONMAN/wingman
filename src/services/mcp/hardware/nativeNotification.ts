import { Alert, Platform, NativeModules, PermissionsAndroid } from 'react-native';

const { WingmanNotification } = NativeModules;

export interface NotificationAction {
  id: string;
  title: string;
  style?: 'default' | 'cancel' | 'destructive';
}

export class NativeNotificationService {
  /**
   * Request POST_NOTIFICATIONS runtime permission on Android 13+ (API 33+)
   */
  private static async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;

    try {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      const hasPermission = await PermissionsAndroid.check(permission);
      if (hasPermission) return true;

      const result = await PermissionsAndroid.request(permission, {
        title: 'Wingman Notification Permission',
        message: 'Wingman needs notification access to alert you for important updates and agent events.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  static async sendNotification(
    title: string,
    message: string,
    actions?: NotificationAction[]
  ): Promise<{ delivered: boolean; actionClicked?: string }> {
    // 1. Deliver native heads-up notification via system tray if on Android
    if (Platform.OS === 'android' && WingmanNotification?.postNotification) {
      try {
        await WingmanNotification.postNotification(title, message);
        return { delivered: true };
      } catch (err: any) {
        console.warn('[NativeNotificationService] Native notification post error, trying permission:', err?.message || err);
        try {
          const granted = await this.requestNotificationPermission();
          if (granted) {
            await WingmanNotification.postNotification(title, message);
            return { delivered: true };
          }
        } catch {}
      }
    }

    // 2. In-app Alert dialog fallback
    return new Promise((resolve) => {
      const alertButtons: any[] = (actions && actions.length > 0)
        ? actions.map((act) => ({
            text: act.title,
            style: act.style || 'default',
            onPress: () => resolve({ delivered: true, actionClicked: act.id })
          }))
        : [{ text: 'OK', onPress: () => resolve({ delivered: true }) }];

      Alert.alert(title, message, alertButtons, { cancelable: true });
    });
  }
}
