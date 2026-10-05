import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Plus, UserMinus, Lock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useGroupStore } from '@/store/groupStore';
import { useFriendStore } from '@/store/friendStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

const PRESET_ICONS = [
  '🏖', '✈️', '🍕', '🏠', '🍿', '🚗',
  '💼', '🍻', '⚡', '🎉', '☕', '🎮',
  '🛒', '⛰️', '🍔', '🎳',
];

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const groups = useGroupStore((s) => s.groups);
  const updateGroup = useGroupStore((s) => s.updateGroup);
  const deleteGroup = useGroupStore((s) => s.deleteGroup);
  const addGroupMember = useGroupStore((s) => s.addGroupMember);
  const removeGroupMember = useGroupStore((s) => s.removeGroupMember);

  const friends = useFriendStore((s) => s.friends);
  const addFriend = useFriendStore((s) => s.addFriend);

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);

  const [name, setName] = useState(group?.name || '');
  const [selectedIcon, setSelectedIcon] = useState(group?.icon || '🏖');
  const [isAddingNewMember, setIsAddingNewMember] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  // Available friends not yet in the group
  const groupMemberFriendIds = useMemo(
    () => new Set(group?.members?.map((m) => m.friendId).filter(Boolean)),
    [group]
  );

  const availableFriends = useMemo(
    () => friends.filter((f) => !groupMemberFriendIds.has(f.id)),
    [friends, groupMemberFriendIds]
  );

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Group not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Group name cannot be empty.');
      return;
    }
    updateGroup(group.id, { name: trimmed, icon: selectedIcon });
    router.back();
  };

  const handleAddExistingFriend = (friendId: string) => {
    addGroupMember(group.id, friendId);
  };

  const handleQuickAddFriend = () => {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    const newFriend = addFriend({ name: trimmed });
    addGroupMember(group.id, newFriend.id);
    setNewFriendName('');
    setIsAddingNewMember(false);
  };

  const handleRemoveMember = (friendId: string | null, memberName: string) => {
    if (friendId === null) {
      Alert.alert('Notice', 'You cannot remove yourself from the group.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const res = removeGroupMember(group.id, friendId);
            if (!res.success) {
              Alert.alert('Cannot Remove Member', res.message || 'Historical expenses exist.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? All group expenses and history will be permanently deleted. This does NOT affect any personal Spendz records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Group',
          style: 'destructive',
          onPress: () => {
            deleteGroup(group.id);
            router.replace('/(tabs)/friends' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Edit Group
        </Text>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Text style={[styles.saveBtnText, { color: colors.accent }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Name & Icon Input */}
        <View style={styles.groupInfoCard}>
          <View
            style={[
              styles.iconPreviewBox,
              {
                backgroundColor: colors.accentLight,
                borderColor: colors.accent,
              },
            ]}
          >
            <Text style={styles.iconPreviewText}>{selectedIcon}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Input
              label="Group Name"
              value={name}
              onChangeText={setName}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {/* Icon Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CHOOSE AN ICON
          </Text>
        </View>
        <View
          style={[
            styles.iconGrid,
            { backgroundColor: colors.surface, borderColor: colors.border },
            shadows.sm,
          ]}
        >
          {PRESET_ICONS.map((icon) => {
            const isSelected = selectedIcon === icon;
            return (
              <TouchableOpacity
                key={icon}
                onPress={() => setSelectedIcon(icon)}
                activeOpacity={0.7}
                style={[
                  styles.iconOption,
                  isSelected && {
                    backgroundColor: colors.accentLight,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Group Members Section */}
        <View style={[styles.sectionHeader, styles.splitHeader]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CURRENT MEMBERS ({group.members?.length || 1})
          </Text>
          <TouchableOpacity
            onPress={() => setIsAddingNewMember(!isAddingNewMember)}
            style={[
              styles.addFriendInlineBtn,
              { backgroundColor: colors.accentLight, borderColor: colors.accent },
            ]}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.addFriendInlineText, { color: colors.textPrimary }]}>
              Add Member
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline Add Member Box */}
        {isAddingNewMember && (
          <View
            style={[
              styles.addMemberBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.sm,
            ]}
          >
            {availableFriends.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                  Select from existing friends:
                </Text>
                <View style={styles.friendChipsWrap}>
                  {availableFriends.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => handleAddExistingFriend(f.id)}
                      style={[
                        styles.friendChip,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Avatar name={f.name} color={f.avatarColor} size={24} />
                      <Text style={[styles.friendChipName, { color: colors.textPrimary }]}>
                        {f.name}
                      </Text>
                      <Plus size={14} color={colors.accent} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              Or create a new friend:
            </Text>
            <TextInput
              placeholder="Friend's name..."
              placeholderTextColor={colors.textTertiary}
              value={newFriendName}
              onChangeText={setNewFriendName}
              style={[
                styles.quickAddInput,
                { color: colors.textPrimary, borderColor: colors.border },
              ]}
            />
            <View style={styles.quickAddActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setIsAddingNewMember(false)}
              />
              <Button
                title="Add to Group"
                size="sm"
                onPress={handleQuickAddFriend}
                disabled={!newFriendName.trim()}
              />
            </View>
          </View>
        )}

        {/* Current Members List */}
        <View
          style={[
            styles.membersCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            shadows.sm,
          ]}
        >
          {group.members?.map((m, idx) => {
            const isMe = m.friendId === null;
            const displayName = isMe ? 'You' : m.friend?.name || 'Friend';
            const isLast = idx === (group.members?.length || 1) - 1;

            return (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: isLast ? 0 : 1,
                  },
                ]}
              >
                <Avatar
                  name={displayName}
                  color={m.friend?.avatarColor}
                  size={36}
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                    {displayName} {isMe ? '(You)' : ''}
                  </Text>
                  {isMe ? (
                    <Text style={[styles.memberSubtext, { color: colors.textTertiary }]}>
                      Group Creator
                    </Text>
                  ) : null}
                </View>

                {isMe ? (
                  <View
                    style={[
                      styles.lockedBadge,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <Lock size={12} color={colors.textSecondary} />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(m.friendId, displayName)}
                    activeOpacity={0.7}
                    style={styles.removeBtn}
                  >
                    <UserMinus size={18} color={colors.expense} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Delete Group Action */}
        <View style={styles.deleteSection}>
          <TouchableOpacity
            onPress={handleDeleteGroup}
            activeOpacity={0.7}
            style={[
              styles.deleteBtn,
              {
                backgroundColor: colors.expenseLight,
                borderColor: colors.expense,
              },
            ]}
          >
            <Trash2 size={18} color={colors.expense} />
            <Text style={[styles.deleteBtnText, { color: colors.expense }]}>
              Delete Group
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  groupInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconPreviewBox: {
    width: 58,
    height: 58,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  iconPreviewText: {
    fontSize: 30,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionText: {
    fontSize: 22,
  },
  addFriendInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  addFriendInlineText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  addMemberBox: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  subLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  friendChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  friendChipName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  quickAddInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  quickAddActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  membersCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  memberSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 1,
  },
  lockedBadge: {
    padding: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  removeBtn: {
    padding: 6,
  },
  deleteSection: {
    marginTop: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.sm,
  },
  deleteBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
});
