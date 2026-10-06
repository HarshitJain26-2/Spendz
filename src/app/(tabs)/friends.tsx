import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Search, X, Bell, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useBottomTabInset } from '@/hooks/useBottomTabInset';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useGroupStore } from '@/store/groupStore';
import { useAppStore } from '@/store/appStore';
import { BalanceSummary, type FriendBalanceItem } from '@/components/friends/BalanceSummary';
import { FriendCard } from '@/components/friends/FriendCard';
import { GroupCard } from '@/components/friends/GroupCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

export default function FriendsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottomTabInset = useBottomTabInset(spacing.lg);
  const userProfile = useAppStore((s) => s.userProfile);

  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');

  // Friends store selectors
  const friends = useFriendStore((s) => s.friends);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const getFriendBalance = useSplitStore((s) => s.getFriendBalance);

  // Groups store selectors
  const groups = useGroupStore((s) => s.groups);
  const groupExpenses = useGroupStore((s) => s.groupExpenses);
  const groupSettlements = useGroupStore((s) => s.groupSettlements);
  const getGroupBalanceForMe = useGroupStore((s) => s.getGroupBalanceForMe);

  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const reloadAll = useCallback(() => {
    useGroupStore.getState().loadGroups();
    useFriendStore.getState().loadFriends();
    useSplitStore.getState().loadSplitExpenses();
  }, []);

  // Reload persisted stores on focus (both tab focus & parent stack pop focus)
  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll])
  );

  useEffect(() => {
    const unsub1 = navigation.addListener('focus', reloadAll);
    const parentNav = navigation.getParent();
    const unsub2 = parentNav?.addListener('focus', reloadAll);

    return () => {
      unsub1();
      unsub2?.();
    };
  }, [navigation, reloadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reloadAll();
    setRefreshing(false);
  }, [reloadAll]);

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate friend balances and total summary
  const { friendBalanceMap, totalYouOwe, totalOwedToYou, allBreakdown } =
    useMemo(() => {
      let owe = 0;
      let owed = 0;
      const map = new Map<string, number>();
      const breakdown: FriendBalanceItem[] = [];

      for (const friend of friends) {
        const bal = getFriendBalance(friend.id);
        map.set(friend.id, bal);
        breakdown.push({ friend, balance: bal });
        if (bal > 0) {
          owed += bal;
        } else if (bal < 0) {
          owe += Math.abs(bal);
        }
      }

      // Sort breakdown by absolute balance descending
      breakdown.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

      return {
        friendBalanceMap: map,
        totalYouOwe: owe,
        totalOwedToYou: owed,
        allBreakdown: breakdown,
      };
    }, [friends, splitExpenses, getFriendBalance]);

  // 2. Filter & sort friends deterministically
  const sortedFilteredFriends = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = friends.filter((f) => {
      if (!query) return true;
      const nameMatch = f.name.toLowerCase().includes(query);
      const phoneMatch = f.phone?.toLowerCase().includes(query);
      return nameMatch || phoneMatch;
    });

    return filtered.sort((a, b) => {
      const balA = friendBalanceMap.get(a.id) || 0;
      const balB = friendBalanceMap.get(b.id) || 0;
      const absA = Math.abs(balA);
      const absB = Math.abs(balB);

      const nonZeroA = absA > 0;
      const nonZeroB = absB > 0;

      // 1. Non-zero balances come first
      if (nonZeroA && !nonZeroB) return -1;
      if (!nonZeroA && nonZeroB) return 1;

      // 2. If both are non-zero, sort by largest absolute balance descending
      if (nonZeroA && nonZeroB) {
        if (absB !== absA) return absB - absA;
        return a.name.localeCompare(b.name);
      }

      // 3. Settled friends sorted alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [friends, searchQuery, friendBalanceMap]);

  // 3. Group balances and filtering
  const { groupBalanceMap } = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of groups) {
      map.set(g.id, getGroupBalanceForMe(g.id));
    }
    return { groupBalanceMap: map };
  }, [groups, groupExpenses, groupSettlements, getGroupBalanceForMe]);

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
      {/* 1. App Top Header (Matches Activity Header) */}
      <View style={styles.header}>
        <View style={styles.logoGroup}>
          <Image
            source={require('@/assets/images/spendz-logo.png')}
            style={styles.logoBadge}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>
              Spendz
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textTertiary }]}>
              {activeTab === 'friends' ? 'Friends' : 'Groups'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.iconButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Bell size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/profile' as any)}
            activeOpacity={0.7}
          >
            <Avatar
              name={userProfile.fullName || userProfile.name || 'You'}
              avatarUri={userProfile.avatarUri}
              size={36}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Control Switcher: [ Friends ] [ Groups ] */}
      <View
        style={[
          styles.tabSwitcher,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          shadows.sm,
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            setActiveTab('friends');
            setSearchQuery('');
          }}
          activeOpacity={0.8}
          style={[
            styles.tabBtn,
            activeTab === 'friends' && {
              backgroundColor: colors.accent,
              ...shadows.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'friends' ? '#FFFFFF' : colors.textSecondary,
                fontFamily: activeTab === 'friends' ? typography.fontFamily.semiBold : typography.fontFamily.medium,
              },
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('groups');
            setSearchQuery('');
          }}
          activeOpacity={0.8}
          style={[
            styles.tabBtn,
            activeTab === 'groups' && {
              backgroundColor: colors.accent,
              ...shadows.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'groups' ? '#FFFFFF' : colors.textSecondary,
                fontFamily: activeTab === 'groups' ? typography.fontFamily.semiBold : typography.fontFamily.medium,
              },
            ]}
          >
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'friends' ? (
        <>
          {/* 2. Friends Title Row with Count Pill and Add Friend button */}
          <View style={styles.titleRow}>

        <View style={styles.titleWithCount}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Friends
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
              {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/friends/add' as any)}
          activeOpacity={0.7}
          style={[
            styles.addFriendBtn,
            {
              backgroundColor: colors.accentLight,
              borderColor: colors.accent,
            },
          ]}
        >
          <Plus size={15} color={colors.accent} strokeWidth={2.4} />
          <Text style={[styles.addFriendText, { color: colors.textPrimary }]}>
            Add Friend
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Search Bar (Matching Activity Search Bar) */}
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
          placeholder="Search friends..."
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

      {/* 4. Friends Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabInset },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Overall Balance Summary Card (only if friends exist) */}
        {friends.length > 0 && (
          <BalanceSummary
            totalYouOwe={totalYouOwe}
            totalOwedToYou={totalOwedToYou}
            breakdown={allBreakdown}
          />
        )}

        {/* Section Header */}
        {friends.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ALL FRIENDS
            </Text>
          </View>
        )}

        {/* Friend List / Empty State */}
        {friends.length === 0 ? (
          <EmptyState
            title="No friends yet"
            description="Add friends to split expenses and keep track of who owes whom."
            actionLabel="+ Add Friend"
            onAction={() => router.push('/friends/add' as any)}
          />
        ) : sortedFilteredFriends.length === 0 ? (
          <EmptyState
            title="No friends found"
            description="Try another name."
          />
        ) : (
          sortedFilteredFriends.map((friend) => {
            const bal = friendBalanceMap.get(friend.id) || 0;
            return (
              <FriendCard
                key={friend.id}
                friend={friend}
                balance={bal}
                onPress={() => router.push(`/friends/${friend.id}` as any)}
              />
            );
          })
        )}
      </ScrollView>
        </>
      ) : (
        <>
          {/* Groups Title Row with Count Pill and New Group button */}
          <View style={styles.titleRow}>
            <View style={styles.titleWithCount}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
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

            <TouchableOpacity
              onPress={() => router.push('/groups/create' as any)}
              activeOpacity={0.7}
              style={[
                styles.addFriendBtn,
                {
                  backgroundColor: colors.accentLight,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Plus size={15} color={colors.accent} strokeWidth={2.4} />
              <Text style={[styles.addFriendText, { color: colors.textPrimary }]}>
                New Group
              </Text>
            </TouchableOpacity>
          </View>

          {/* Groups Search Bar */}
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

          {/* Groups Content ScrollView */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomTabInset },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
          >
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
        </>
      )}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xs,
    padding: 3,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 14,
  },
  titleRow: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  addFriendText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.body,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
