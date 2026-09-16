import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onChange,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceElevated },
        style,
      ]}
    >
      {segments.map((segment, index) => {
        const isSelected = index === selectedIndex;
        return (
          <TouchableOpacity
            key={segment}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
            style={[
              styles.segment,
              isSelected && [
                styles.selectedSegment,
                { backgroundColor: colors.surface },
              ],
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isSelected ? colors.textPrimary : colors.textSecondary,
                  fontFamily: isSelected
                    ? typography.fontFamily.semiBold
                    : typography.fontFamily.regular,
                },
              ]}
            >
              {segment}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  selectedSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: typography.fontSize.bodySmall,
  },
});
