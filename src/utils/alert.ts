import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Polyfill for React Native's Alert.alert on Web platform,
 * where react-native-web defaults to an empty function.
 */
export const initAlertPolyfill = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[]
    ) => {
      const fullMessage = [title, message].filter(Boolean).join('\n\n');

      if (!buttons || buttons.length === 0) {
        window.alert(fullMessage);
        return;
      }

      if (buttons.length === 1) {
        window.alert(fullMessage);
        buttons[0].onPress?.();
        return;
      }

      // Two or more buttons: typically Cancel + Confirm/Delete
      const confirmed = window.confirm(fullMessage);
      if (confirmed) {
        const confirmBtn =
          buttons.find((b) => b.style === 'destructive') ||
          buttons.find((b) => b.style !== 'cancel') ||
          buttons[buttons.length - 1];
        confirmBtn?.onPress?.();
      } else {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        cancelBtn?.onPress?.();
      }
    };
  }
};

/**
 * Direct cross-platform alert function for guaranteed execution
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const fullMessage = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length === 0) {
      window.alert(fullMessage);
      return;
    }

    if (buttons.length === 1) {
      window.alert(fullMessage);
      buttons[0].onPress?.();
      return;
    }

    const confirmed = window.confirm(fullMessage);
    if (confirmed) {
      const confirmBtn =
        buttons.find((b) => b.style === 'destructive') ||
        buttons.find((b) => b.style !== 'cancel') ||
        buttons[buttons.length - 1];
      confirmBtn?.onPress?.();
    } else {
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      cancelBtn?.onPress?.();
    }
    return;
  }

  Alert.alert(title, message, buttons);
};
