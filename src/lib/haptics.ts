import * as Haptics from 'expo-haptics';

export const haptics = {
  // Confirmations — something big happened
  heavy: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Actions — request sent, calendar connected, court selected
  medium: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Selections — chip toggle, filter pill, list item tap
  light: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Success — pull-to-refresh done, match accepted
  success: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Errors — declined, failed action
  error: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Warnings — slot no longer free, expiry notice
  warning: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
