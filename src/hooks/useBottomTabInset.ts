import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { spacing } from '@/theme/spacing';

/**
 * Dynamically computes the safe bottom clearance required for scrollable
 * tab screens to sit cleanly above the custom floating bottom tab bar.
 * Adapts to Android gesture navigation, 3-button navigation, and iOS home indicator.
 */
export const useBottomTabInset = (extraPadding: number = spacing.md): number => {
  const insets = useSafeAreaInsets();
  const systemBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const TAB_BAR_BASE_HEIGHT = 64;

  return TAB_BAR_BASE_HEIGHT + systemBottomInset + extraPadding;
};
