import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronDown, ChevronUp, Users, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

const isFabric = Boolean(
  (globalThis as any).nativeFabricUIManager || (globalThis as any)._IS_FABRIC
);

if (
  Platform.OS === 'android' &&
  !isFabric &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface GroupMemberBalanceItem {
  id: string;
  name: string;
  friendId?: string | null;
  balance: number; // positive = owes you, negative = you owe
}

interface GroupBalanceSummaryProps {
  totalYouOwe: number;
  totalOwedToYou: number;
  breakdown: GroupMemberBalanceItem[];
  emptyNote?: string;
  onMemberPress?: (item: GroupMemberBalanceItem) => void;
}

export const GroupBalanceSummary: React.FC<GroupBalanceSummaryProps> = ({
  totalYouOwe,
  totalOwedToYou,
  breakdown,
  emptyNote = 'No pending debts or credits in this group.',
  onMemberPress,
}) => {
  const { colors } = useTheme();

  const hasDebts = totalYouOwe > 0;
  const hasCredits = totalOwedToYou > 0;
  const isAllSettled = !hasDebts && !hasCredits;

  const [isExpanded, setIsExpanded] = useState<boolean>(!isAllSettled);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Filter items with non-zero balance for the breakdown
  const nonZeroItems = breakdown.filter((item) => item.balance !== 0);

  // Group into who user owes and who owes user
  const youOweList = nonZeroItems.filter((i) => i.balance < 0);
  const owesYouList = nonZeroItems.filter((i) => i.balance > 0);

  // Determine header color & badge configuration
  const getHeaderDetails = () => {
    if (isAllSettled) {
      return {
        title: 'All settled ✓',
        subtitle: 'Everyone is settled up',
        badgeBg: colors.incomeLight,
        badgeText: colors.income,
        icon: <CheckCircle2 size={18} color={colors.income} strokeWidth={2.2} />,
      };
    }

    if (hasDebts && !hasCredits) {
      return {
        title: `You owe ${formatCurrency(totalYouOwe)} in this group`,
        subtitle: `${youOweList.length} ${youOweList.length === 1 ? 'person' : 'people'} to pay back`,
        badgeBg: colors.expenseLight,
        badgeText: colors.expense,
        icon: <Users size={18} color={colors.expense} strokeWidth={2.2} />,
      };
    }

    if (hasCredits && !hasDebts) {
      return {
        title: `You are owed ${formatCurrency(totalOwedToYou)} in this group`,
        subtitle: `${owesYouList.length} ${owesYouList.length === 1 ? 'person owes' : 'people owe'} you`,
        badgeBg: colors.incomeLight,
        badgeText: colors.income,
        icon: <Users size={18} color={colors.income} strokeWidth={2.2} />,
      };
    }

    // Both directions exist
    return {
      title: `You owe ${formatCurrency(totalYouOwe)}`,
      subtitle: `You are owed ${formatCurrency(totalOwedToYou)}`,
      badgeBg: colors.surfaceElevated,
      badgeText: colors.textPrimary,
      icon: <Users size={18} color={colors.textPrimary} strokeWidth={2.2} />,
    };
  };

  const header = getHeaderDetails();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadows.sm,
      ]}
    >
      {/* Header clickable row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleExpand}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: header.badgeBg }]}>
            {header.icon}
          </View>
          <View style={styles.headerTexts}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color:
                    isAllSettled || (hasCredits && !hasDebts)
                      ? colors.income
                      : hasDebts && !hasCredits
                      ? colors.expense
                      : colors.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              {header.title}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    hasDebts && hasCredits
                      ? colors.income
                      : colors.textTertiary,
                },
              ]}
              numberOfLines={1}
            >
              {header.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <View style={[styles.breakdownContainer, { borderTopColor: colors.border }]}>
          {isAllSettled ? (
            <View style={styles.settledNote}>
              <Text style={[styles.settledText, { color: colors.textSecondary }]}>
                {emptyNote}
              </Text>
            </View>
          ) : (
            <View style={styles.breakdownList}>
              {/* You owe section */}
              {youOweList.map((item) => {
                const row = (
                  <View key={`owe-${item.id}`} style={styles.breakdownItem}>
                    <View
                      style={[
                        styles.verticalLine,
                        { backgroundColor: colors.expense },
                      ]}
                    />
                    <Text
                      style={[styles.breakdownText, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      You owe{' '}
                      <Text
                        style={[
                          styles.boldName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: colors.expense }]}>
                      {formatCurrency(Math.abs(item.balance))}
                    </Text>
                  </View>
                );

                if (onMemberPress && item.friendId) {
                  return (
                    <TouchableOpacity
                      key={`owe-${item.id}`}
                      activeOpacity={0.7}
                      onPress={() => onMemberPress(item)}
                    >
                      {row}
                    </TouchableOpacity>
                  );
                }

                return row;
              })}

              {/* Owes you section */}
              {owesYouList.map((item) => {
                const row = (
                  <View key={`owed-${item.id}`} style={styles.breakdownItem}>
                    <View
                      style={[
                        styles.verticalLine,
                        { backgroundColor: colors.income },
                      ]}
                    />
                    <Text
                      style={[styles.breakdownText, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      <Text
                        style={[
                          styles.boldName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.name}
                      </Text>{' '}
                      owes you
                    </Text>
                    <Text style={[styles.breakdownAmount, { color: colors.income }]}>
                      {formatCurrency(item.balance)}
                    </Text>
                  </View>
                );

                if (onMemberPress && item.friendId) {
                  return (
                    <TouchableOpacity
                      key={`owed-${item.id}`}
                      activeOpacity={0.7}
                      onPress={() => onMemberPress(item)}
                    >
                      {row}
                    </TouchableOpacity>
                  );
                }

                return row;
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  headerRight: {
    padding: spacing.xs,
  },
  breakdownContainer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  breakdownList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  verticalLine: {
    width: 3,
    height: 18,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  breakdownText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginRight: spacing.sm,
  },
  boldName: {
    fontFamily: typography.fontFamily.semiBold,
  },
  breakdownAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
  settledNote: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  settledText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
  },
});
