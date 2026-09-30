import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F472B6',
  '#60A5FA', '#34D399', '#FB923C', '#E879F9', '#38BDF8',
];

export interface AvatarProps {
  name: string;
  avatarUri?: string | null;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUri,
  size = 40,
  color,
  style,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  const safeName = (name || '').trim() || 'You';

  // Generate a consistent color from the name
  const getColor = () => {
    if (color) return color;
    const charCode = safeName.charCodeAt(0) + (safeName.charCodeAt(1) || 0);
    return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
  };

  const getInitials = () => {
    const parts = safeName.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return safeName.slice(0, 2).toUpperCase();
  };

  if (avatarUri && !imageError) {
    return (
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <Image
          source={{ uri: avatarUri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  const bgColor = getColor();
  const fontSize = size * 0.4;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${bgColor}20`,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color: bgColor,
            fontSize,
          },
        ]}
      >
        {getInitials()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: typography.fontFamily.bold,
  },
});

