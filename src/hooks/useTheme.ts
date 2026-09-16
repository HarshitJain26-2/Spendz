import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/appStore';

export type Theme = {
  colors: ThemeColors;
  isDark: boolean;
};

export const useTheme = (): Theme => {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.themeMode);

  const isDark =
    themeMode === 'dark'
      ? true
      : themeMode === 'light'
        ? false
        : systemScheme === 'dark';

  return {
    colors: isDark ? colors.dark : colors.light,
    isDark,
  };
};
