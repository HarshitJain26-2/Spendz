import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { shadows } from '@/theme/spacing';

interface FABProps {
  icon: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
}

export const FAB: React.FC<FABProps> = ({
  icon,
  onPress,
  style,
  size = 56,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          styles.fab,
          shadows.lg,
          {
            backgroundColor: colors.accent,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
