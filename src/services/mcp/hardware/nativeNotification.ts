import { Alert, Platform } from 'react-native';

export interface NotificationAction {
  id: string;
  title: string;
  style?: 'default' | 'cancel' | 'destructive';
}

export class NativeNotificationService {
  static async sendNotification(
    title: string,
    message: string,
    actions?: NotificationAction[]
  ): Promise<{ delivered: boolean; actionClicked?: string }> {
    return new Promise((resolve) => {
      const alertButtons: any[] = (actions && actions.length > 0)
        ? actions.map((act) => ({
            text: act.title,
            style: act.style || 'default',
            onPress: () => resolve({ delivered: true, actionClicked: act.id })
          }))
        : [{ text: 'OK', onPress: () => resolve({ delivered: true }) }];

      // Display system heads-up alert
      Alert.alert(title, message, alertButtons, { cancelable: true });
    });
  }
}
