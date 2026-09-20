import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { FileText, Mic } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface NoteCardProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: ViewStyle;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  value,
  onChangeText,
  placeholder = 'Dinner with team',
  onFocus,
  onBlur,
  inputRef: externalInputRef,
  onLayout,
  style,
}) => {
  const { colors } = useTheme();
  const internalInputRef = useRef<TextInput>(null);
  const ref = externalInputRef || internalInputRef;

  const handleCardPress = () => {
    onFocus?.();
    ref.current?.focus();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleCardPress}
      onLayout={onLayout}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <FileText size={18} color={colors.textSecondary} strokeWidth={2} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          NOTE
        </Text>
        <TextInput
          ref={ref as any}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.textPrimary }]}
          returnKeyType="done"
          onSubmitEditing={onBlur}
        />
      </View>

      <View style={styles.rightIcon}>
        <Mic size={18} color={colors.textTertiary} strokeWidth={1.8} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
    padding: 0,
    margin: 0,
  },
  rightIcon: {
    padding: spacing.xs,
  },
});
