import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Users,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

const TRANSACTION_TYPES = [
  {
    type: 'expense',
    label: 'Expense',
    description: 'Track money going out',
    icon: ArrowDownLeft,
    color: '#EF4444',
    route: '/add/expense',
  },
  {
    type: 'income',
    label: 'Income',
    description: 'Track money coming in',
    icon: ArrowUpRight,
    color: '#22C55E',
    route: '/add/income',
  },
  {
    type: 'transfer',
    label: 'Transfer',
    description: 'Move between accounts',
    icon: ArrowLeftRight,
    color: '#3B82F6',
    route: '/add/transfer',
  },
  {
    type: 'split',
    label: 'Split Expense',
    description: 'Split with friends',
    icon: Users,
    color: '#8B5CF6',
    route: '/add/split',
  },
] as const;

export default function AddIndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Add Transaction
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
          activeOpacity={0.7}
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        What would you like to add?
      </Text>

      {/* Options */}
      <View style={styles.options}>
        {TRANSACTION_TYPES.map((item, index) => {
          const Icon = item.icon;
          return (
            <Animated.View
              key={item.type}
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <TouchableOpacity
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <Icon size={24} color={item.color} strokeWidth={2} />
                </View>
                <View style={styles.optionInfo}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    marginBottom: spacing['3xl'],
  },
  options: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.lg,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  optionDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.bodySmall,
  },
});
