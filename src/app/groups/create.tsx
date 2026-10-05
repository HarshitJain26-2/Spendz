import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Plus, Lock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/friendStore';
import { useGroupStore } from '@/store/groupStore';
import { useAppStore } from '@/store/appStore';
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

export default function CreateGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const friends = useFriendStore((s) => s.friends);
  const addFriend = useFriendStore((s) => s.addFriend);
  const addGroup = useGroupStore((s) => s.addGroup);
  const userProfile = useAppStore((s) => s.userProfile);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏖');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inline add friend state
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleQuickAddFriend = () => {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    const newFriend = addFriend({ name: trimmed });
    setSelectedFriendIds((prev) => [...prev, newFriend.id]);
    setNewFriendName('');
    setIsAddingFriend(false);
  };

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a group name');
      return;
    }

    if (selectedFriendIds.length === 0) {
      setError('Please select at least one friend to join the group');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newGroup = addGroup({
        name: trimmedName,
        icon: selectedIcon,
        memberFriendIds: selectedFriendIds,
      });

      router.replace(`/groups/${newGroup.id}` as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to create group');
      setIsSubmitting(false);
    }
  };

  const myDisplayName = userProfile.fullName || userProfile.name || 'You';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
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
            Create Group
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Icon Selector Circle & Name Input */}
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
                placeholder="e.g. Goa Trip, Flatmates, Dinner"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError(null);
                }}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>

          {/* Preset Icon Picker */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              CHOOSE AN ICON
            </Text>
          </View>
          <View
            style={[
              styles.iconGrid,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
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

          {/* Members Selection Header */}
          <View style={[styles.sectionHeader, styles.splitHeader]}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                GROUP MEMBERS ({1 + selectedFriendIds.length})
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
                You are automatically added as a member
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsAddingFriend(true)}
              style={[
                styles.addFriendInlineBtn,
                { backgroundColor: colors.accentLight, borderColor: colors.accent },
              ]}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.accent} strokeWidth={2.5} />
              <Text style={[styles.addFriendInlineText, { color: colors.textPrimary }]}>
                Add Friend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick inline friend input */}
          {isAddingFriend && (
            <View
              style={[
                styles.quickAddBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                shadows.sm,
              ]}
            >
              <TextInput
                placeholder="Friend's Name"
                placeholderTextColor={colors.textTertiary}
                value={newFriendName}
                onChangeText={setNewFriendName}
                style={[
                  styles.quickAddInput,
                  { color: colors.textPrimary, borderColor: colors.border },
                ]}
                autoFocus
              />
              <View style={styles.quickAddActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => setIsAddingFriend(false)}
                />
                <Button
                  title="Add"
                  size="sm"
                  onPress={handleQuickAddFriend}
                  disabled={!newFriendName.trim()}
                />
              </View>
            </View>
          )}

          {/* Members List */}
          <View
            style={[
              styles.membersCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.sm,
            ]}
          >
            {/* Me / Current User (Always included) */}
            <View
              style={[
                styles.memberRow,
                { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <Avatar name={myDisplayName} avatarUri={userProfile.avatarUri} size={38} />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                  {myDisplayName} (You)
                </Text>
                <Text style={[styles.memberRole, { color: colors.textTertiary }]}>
                  Group Creator • Always included
                </Text>
              </View>
              <View
                style={[
                  styles.lockedBadge,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Lock size={12} color={colors.textSecondary} />
                <Text style={[styles.lockedBadgeText, { color: colors.textSecondary }]}>
                  Included
                </Text>
              </View>
            </View>

            {/* Friend List */}
            {friends.length === 0 ? (
              <View style={styles.emptyFriendsBox}>
                <Text style={[styles.emptyFriendsText, { color: colors.textSecondary }]}>
                  No friends found in your Spendz contacts.
                </Text>
                <TouchableOpacity
                  onPress={() => setIsAddingFriend(true)}
                  style={{ marginTop: spacing.sm }}
                >
                  <Text style={[styles.quickAddPrompt, { color: colors.accent }]}>
                    + Add a friend now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              friends.map((friend, idx) => {
                const isSelected = selectedFriendIds.includes(friend.id);
                const isLast = idx === friends.length - 1;

                return (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => toggleFriend(friend.id)}
                    activeOpacity={0.7}
                    style={[
                      styles.memberRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: isLast ? 0 : 1,
                      },
                    ]}
                  >
                    <Avatar
                      name={friend.name}
                      color={friend.avatarColor}
                      size={38}
                    />
                    <View style={styles.memberInfo}>
                      <Text
                        style={[styles.memberName, { color: colors.textPrimary }]}
                      >
                        {friend.name}
                      </Text>
                      {friend.phone ? (
                        <Text
                          style={[
                            styles.memberSubtext,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {friend.phone}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected
                            ? colors.accent
                            : colors.border,
                          backgroundColor: isSelected
                            ? colors.accent
                            : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: colors.expense }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              title="Create Group"
              onPress={handleCreate}
              loading={isSubmitting}
              disabled={!name.trim() || selectedFriendIds.length === 0}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
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
  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
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
  quickAddBox: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickAddInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
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
  memberRole: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  memberSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    marginTop: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  lockedBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFriendsBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFriendsText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  quickAddPrompt: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  errorBox: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: spacing.xl,
  },
});
