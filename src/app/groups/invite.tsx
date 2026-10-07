import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Users,
  Clock,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useGroupStore } from '@/store/groupStore';
import { QRCode } from '@/components/ui/QRCode';
import { createInvitePayload } from '@/utils/inviteCode';
import { showAlert } from '@/utils/alert';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { GroupInvite } from '@/types';

export default function GroupInviteScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { groupId, id } = useLocalSearchParams<{ groupId?: string; id?: string }>();

  const targetGroupId = groupId || id;

  const groups = useGroupStore((s) => s.groups);
  const getOrCreateInvite = useGroupStore((s) => s.getOrCreateInvite);
  const revokeInviteStore = useGroupStore((s) => s.revokeInvite);

  const group = useMemo(
    () => groups.find((g) => g.id === targetGroupId),
    [groups, targetGroupId]
  );

  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Initialize or fetch the active invite for this group
  const loadInvite = useCallback(() => {
    if (!targetGroupId) return;
    try {
      const inv = getOrCreateInvite(targetGroupId);
      setInvite(inv);
    } catch (e) {
      console.warn('Failed to load group invite:', e);
    }
  }, [targetGroupId, getOrCreateInvite]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  const qrPayload = useMemo(() => {
    if (!invite?.code) return '';
    return createInvitePayload(invite.code);
  }, [invite?.code]);

  // Handle Copy Code
  const handleCopyCode = async () => {
    if (!invite?.code) return;
    try {
      await Clipboard.setStringAsync(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Failed to copy invite code:', e);
    }
  };

  // Handle Share Invite
  const handleShareInvite = async () => {
    if (!invite?.code || !group) return;

    const payload = createInvitePayload(invite.code);
    const message = `Join my ${group.name} group on Spendz.\n\nInvite code:\n${invite.code}\n\nYou can also join using this invite link:\n${payload}`;

    try {
      await Share.share({
        message,
        title: `Invite to ${group.name}`,
      });
    } catch (e) {
      console.warn('Share dismissed or failed:', e);
    }
  };

  // Handle Revoke Invite
  const handleRevokeInvite = () => {
    if (!invite) return;

    showAlert(
      'Revoke Invite?',
      'Anyone who has this invite code or QR code will no longer be able to join the group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            setIsRevoking(true);
            try {
              revokeInviteStore(invite.id);
              setInvite((prev) => (prev ? { ...prev, isActive: false } : null));
              showAlert('Invite Revoked', 'The previous invite code is no longer active.');
            } finally {
              setIsRevoking(false);
            }
          },
        },
      ]
    );
  };

  // Generate a fresh invite if revoked
  const handleGenerateNewInvite = () => {
    if (!targetGroupId) return;
    const newInv = getOrCreateInvite(targetGroupId);
    setInvite(newInv);
  };

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Invite</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Group not found or has been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const memberCount = group.members?.length || 1;
  const isRevoked = invite ? !invite.isActive : false;

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

        <View style={styles.titleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            Invite to {group.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            Spendz Group Invitation
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Invite Card */}
        <View
          style={[
            styles.inviteCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.md,
          ]}
        >
          {/* Group Identity Header */}
          <View style={styles.groupHeaderRow}>
            <View
              style={[
                styles.groupIconBox,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
              ]}
            >
              <Text style={styles.groupIconEmoji}>{group.icon || '🏖'}</Text>
            </View>
            <View style={styles.groupDetails}>
              <Text style={[styles.groupName, { color: colors.textPrimary }]} numberOfLines={1}>
                {group.name}
              </Text>
              <View style={styles.groupMetaRow}>
                <Users size={13} color={colors.textTertiary} />
                <Text style={[styles.groupMetaText, { color: colors.textSecondary }]}>
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </Text>
                <Text style={[styles.groupMetaDot, { color: colors.textTertiary }]}>•</Text>
                <Clock size={13} color={colors.textTertiary} />
                <Text style={[styles.groupMetaText, { color: colors.textSecondary }]}>
                  {invite?.expiresAt ? `Expires: ${new Date(invite.expiresAt).toLocaleDateString()}` : 'Expires: Never'}
                </Text>
              </View>
            </View>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrSection}>
            {isRevoked ? (
              <View
                style={[
                  styles.revokedBox,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <ShieldAlert size={48} color={colors.expense} strokeWidth={1.7} />
                <Text style={[styles.revokedTitle, { color: colors.textPrimary }]}>
                  This invite is no longer active
                </Text>
                <Text style={[styles.revokedSubtitle, { color: colors.textSecondary }]}>
                  The previous code and QR code have been revoked.
                </Text>
                <TouchableOpacity
                  onPress={handleGenerateNewInvite}
                  style={[styles.generateNewBtn, { backgroundColor: colors.accent }]}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.generateNewText}>Generate New Invite</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.qrWrapper}>
                <View
                  style={[
                    styles.qrFrame,
                    {
                      backgroundColor: '#FFFFFF',
                      borderColor: isDark ? colors.border : '#E5E7EB',
                    },
                    shadows.sm,
                  ]}
                >
                  <QRCode
                    value={qrPayload || 'spendz://group-invite/PENDING'}
                    size={190}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                    quietZone={2}
                  />
                </View>
                <Text style={[styles.qrHint, { color: colors.textTertiary }]}>
                  Scan with Spendz or camera to join
                </Text>
              </View>
            )}
          </View>

          {/* Invite Code Box */}
          {!isRevoked && invite && (
            <View
              style={[
                styles.codeCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.codeLabel, { color: colors.textTertiary }]}>
                INVITE CODE
              </Text>
              <Text
                style={[styles.codeValue, { color: colors.textPrimary }]}
                selectable
              >
                {invite.code}
              </Text>
              <Text style={[styles.codeHelp, { color: colors.textSecondary }]}>
                Share this code with your friends.
              </Text>
            </View>
          )}

          {/* Copy & Share Buttons */}
          {!isRevoked && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.8}
                style={[
                  styles.copyBtn,
                  {
                    backgroundColor: copied ? colors.incomeLight : colors.surfaceElevated,
                    borderColor: copied ? colors.income : colors.border,
                  },
                ]}
              >
                {copied ? (
                  <Check size={18} color={colors.income} strokeWidth={2.5} />
                ) : (
                  <Copy size={18} color={colors.textPrimary} strokeWidth={2.2} />
                )}
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: copied ? colors.income : colors.textPrimary },
                  ]}
                >
                  {copied ? 'Invite code copied.' : 'Copy Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareInvite}
                activeOpacity={0.8}
                style={[
                  styles.shareBtn,
                  { backgroundColor: colors.accent },
                  shadows.sm,
                ]}
              >
                <Share2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.shareBtnText}>Share Invite</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Revoke Invite Management Option */}
        {!isRevoked && invite && (
          <View style={styles.managementSection}>
            <TouchableOpacity
              onPress={handleRevokeInvite}
              disabled={isRevoking}
              style={[
                styles.revokeBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              activeOpacity={0.7}
            >
              <ShieldAlert size={16} color={colors.expense} strokeWidth={2} />
              <Text style={[styles.revokeBtnText, { color: colors.expense }]}>
                Revoke Invite
              </Text>
            </TouchableOpacity>
            <Text style={[styles.revokeDisclaimer, { color: colors.textTertiary }]}>
              Revoking will immediately deactivate this code and QR code.
            </Text>
          </View>
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
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  notFoundText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
  },
  inviteCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    gap: spacing.md,
  },
  groupIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconEmoji: {
    fontSize: 24,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupMetaText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  groupMetaDot: {
    fontSize: 12,
  },
  qrSection: {
    marginVertical: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  qrWrapper: {
    alignItems: 'center',
  },
  qrFrame: {
    padding: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHint: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    marginTop: spacing.md,
  },
  revokedBox: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  revokedTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  revokedSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  generateNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  generateNewText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  codeCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  codeLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    letterSpacing: 2,
    marginVertical: 4,
  },
  codeHelp: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.xs,
  },
  copyBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  shareBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  managementSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  revokeBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  revokeDisclaimer: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
});
