import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { ArrowLeft, Search, X, Plus, QrCode } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useGroupStore } from '@/store/groupStore';
import { GroupCard } from '@/components/friends/GroupCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { formatCurrency } from '@/utils/currency';

export default function GroupsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();

  const groups = useGroupStore((s) => s.groups);
  const groupExpenses = useGroupStore((s) => s.groupExpenses);
  const groupSettlements = useGroupStore((s) => s.groupSettlements);
  const getGroupBalanceForMe = useGroupStore((s) => s.getGroupBalanceForMe);

  const [refreshing, setRefreshing] = useState(false);

  const reloadData = useCallback(() => {
    useGroupStore.getState().loadGroups();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadData();
    }, [reloadData])
  );


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reloadData();
    setRefreshing(false);
  }, [reloadData]);

  const [searchQuery, setSearchQuery] = useState('');

  // Calculate balances per group and overall totals across all groups
  const { groupBalanceMap, totalOwedToMe, totalIOwe } = useMemo(() => {
    const map = new Map<string, number>();
    let owed = 0;
    let owe = 0;

    for (const g of groups) {
      const bal = getGroupBalanceForMe(g.id);
      map.set(g.id, bal);
      if (bal > 0) {
        owed += bal;
      } else if (bal < 0) {
        owe += Math.abs(bal);
      }
    }

    return {
      groupBalanceMap: map,
      totalOwedToMe: owed,
      totalIOwe: owe,
    };
  }, [groups, groupExpenses, groupSettlements, getGroupBalanceForMe]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(query));
  }, [groups, searchQuery]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleGroup}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Groups
          </Text>
          <View
            style={[
              styles.countPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => router.push('/groups/join' as any)}
            activeOpacity={0.7}
            style={[
              styles.joinGroupBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <QrCode size={13} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={[styles.joinGroupText, { color: colors.textPrimary }]}>
              Join
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/groups/create' as any)}
            activeOpacity={0.7}
            style={[
              styles.newGroupBtn,
              {
                backgroundColor: colors.accentLight,
                borderColor: colors.accent,
              },
            ]}
          >
            <Plus size={15} color={colors.accent} strokeWidth={2.4} />
            <Text style={[styles.newGroupText, { color: colors.textPrimary }]}>
              New Group
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          shadows.sm,
        ]}
      >
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          placeholder="Search groups..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Groups List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Total Group Balance Summary (if groups exist) */}
        {groups.length > 0 && (totalOwedToMe > 0 || totalIOwe > 0) && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.sm,
            ]}
          >
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                YOU ARE OWED
              </Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>
                {formatCurrency(totalOwedToMe)}
              </Text>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                YOU OWE
              </Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>
                {formatCurrency(totalIOwe)}
              </Text>
            </View>
          </View>
        )}

        {groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            description="Create a group to split expenses with multiple friends for trips, dinners, and events."
            actionLabel="+ New Group"
            onAction={() => router.push('/groups/create' as any)}
          />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            title="No groups found"
            description={`No groups matching "${searchQuery}"`}
            actionLabel="Clear Search"
            onAction={() => setSearchQuery('')}
          />
        ) : (
          filteredGroups.map((group) => {
            const balance = getGroupBalanceForMe(group.id);
            const memberCount = group.members?.length || 1;
            return (
              <GroupCard
                key={`${group.id}-${balance}-${group.updatedAt}`}
                group={group}
                balance={balance}
                memberCount={memberCount}
                onPress={() => router.push(`/groups/${group.id}` as any)}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  countText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  joinGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  joinGroupText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  newGroupText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  summaryCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
});
