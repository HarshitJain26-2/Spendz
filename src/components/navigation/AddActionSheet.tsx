import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

interface AddActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AddActionSheet: React.FC<AddActionSheetProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 26,
          stiffness: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  const handleSelect = (route: '/add/expense' | '/add/income' | '/add/transfer' | '/add/split') => {
    onClose();
    setTimeout(() => {
      router.push(route);
    }, 120);
  };

  const actionOptions = [
    {
      id: 'expense',
      title: 'Expense',
      description: 'Track something you spent money on',
      icon: ArrowDownRight,
      iconColor: colors.expense,
      iconBg: colors.expenseLight,
      route: '/add/expense' as const,
    },
    {
      id: 'income',
      title: 'Income',
      description: 'Record money received',
      icon: ArrowUpRight,
      iconColor: colors.income,
      iconBg: colors.incomeLight,
      route: '/add/income' as const,
    },
    {
      id: 'transfer',
      title: 'Transfer',
      description: 'Move money between your accounts',
      icon: ArrowLeftRight,
      iconColor: colors.transfer,
      iconBg: colors.transferLight,
      route: '/add/transfer' as const,
    },
    {
      id: 'split',
      title: 'Split Expense',
      description: 'Split a bill with friends',
      icon: Users,
      iconColor: colors.accent,
      iconBg: colors.accentLight,
      route: '/add/split' as const,
    },
  ];

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Dimmed backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>

        {/* Animated Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              paddingBottom: bottomInset,
              transform: [{ translateY: sheetTranslateY }],
            },
            shadows.lg,
          ]}
        >
          {/* Top Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          {/* Header Title */}
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            What do you want to add?
          </Text>

          {/* Actions Grouped Card */}
          <View
            style={[
              styles.actionsCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.sm,
            ]}
          >
            {actionOptions.map((option, index) => {
              const Icon = option.icon;
              const isLast = index === actionOptions.length - 1;

              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleSelect(option.route)}
                  activeOpacity={0.7}
                  style={[
                    styles.actionRow,
                    !isLast && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: option.iconBg },
                    ]}
                  >
                    <Icon size={20} color={option.iconColor} strokeWidth={2.4} />
                  </View>

                  <View style={styles.actionTextCol}>
                    <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                      {option.title}
                    </Text>
                    <Text
                      style={[styles.actionDesc, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {option.description}
                    </Text>
                  </View>

                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={[
              styles.cancelButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdropPress: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  actionsCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.semiBold,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    fontFamily: typography.fontFamily.regular,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.semiBold,
  },
});
