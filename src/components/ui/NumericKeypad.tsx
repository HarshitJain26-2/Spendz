import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Delete } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  style?: ViewStyle;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'delete'],
];

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onKeyPress,
  onDelete,
  style,
}) => {
  const { colors } = useTheme();

  const handlePress = (key: string) => {
    if (key === 'delete') {
      onDelete();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {KEYS.map((row, rowIdx) => (
        <View key={`row-${rowIdx}`} style={styles.row}>
          {row.map((key) => {
            const isDelete = key === 'delete';
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePress(key)}
                activeOpacity={0.5}
                style={[
                  styles.key,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  shadows.sm,
                ]}
              >
                {isDelete ? (
                  <Delete size={22} color={colors.textPrimary} strokeWidth={1.8} />
                ) : (
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontFamily: typography.fontFamily.semiBold,
  },
});
