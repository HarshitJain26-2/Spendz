import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraScanner } from '@/components/groups/CameraScanner';
import {
  ArrowLeft,
  QrCode,
  Users,
  Check,
  X,
  AlertCircle,
  Camera,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useGroupStore, type InviteValidationResult } from '@/store/groupStore';
import { useAppStore } from '@/store/appStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { parseInviteCodeFromUrlOrInput } from '@/utils/inviteCode';
import { showAlert } from '@/utils/alert';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { Group } from '@/types';

export default function JoinGroupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { code: paramCode } = useLocalSearchParams<{ code?: string }>();

  const userProfile = useAppStore((s) => s.userProfile);
  const validateInvite = useGroupStore((s) => s.validateInvite);
  const joinGroupByCode = useGroupStore((s) => s.joinGroupByCode);

  const [codeInput, setCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Group Preview State
  const [previewData, setPreviewData] = useState<{
    group: Group;
    memberNames: string[];
    code: string;
    isAlreadyMember: boolean;
  } | null>(null);

  // QR Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Validate and display group preview
  const handleValidateAndPreview = useCallback(
    (codeToValidate: string) => {
      const normalized = (codeToValidate || '').trim().toUpperCase();
      if (!normalized) {
        setErrorMessage('Please enter an invite code.');
        return;
      }

      setErrorMessage(null);
      setIsValidating(true);

      try {
        const result: InviteValidationResult = validateInvite(normalized);

        if (result.status === 'valid') {
          setPreviewData({
            group: result.group,
            memberNames: result.memberNames,
            code: normalized,
            isAlreadyMember: false,
          });
        } else if (result.status === 'already_member') {
          setPreviewData({
            group: result.group,
            memberNames: result.memberNames,
            code: normalized,
            isAlreadyMember: true,
          });
        } else {
          setErrorMessage(result.message);
        }
      } catch (e: any) {
        setErrorMessage('Failed to validate invite. Please try again.');
      } finally {
        setIsValidating(false);
      }
    },
    [validateInvite]
  );

  // Automatically check if prefilled with code (e.g. from deep link or QR)
  useEffect(() => {
    if (paramCode) {
      const parsed = parseInviteCodeFromUrlOrInput(paramCode);
      if (parsed) {
        setCodeInput(parsed);
        handleValidateAndPreview(parsed);
      }
    }
  }, [paramCode, handleValidateAndPreview]);

  // Handle Manual Input Submit
  const handleJoinPress = () => {
    const parsed = parseInviteCodeFromUrlOrInput(codeInput) || codeInput.trim().toUpperCase();
    handleValidateAndPreview(parsed);
  };

  // Open Scanner
  const handleOpenScanner = () => {
    setErrorMessage(null);
    setIsScannerOpen(true);
  };

  // Barcode scanned callback
  const handleBarcodeScanned = (data: string) => {
    const detectedCode = parseInviteCodeFromUrlOrInput(data);
    if (!detectedCode) {
      showAlert(
        'Invalid QR Code',
        "This QR code isn't a valid Spendz group invite.",
        [
          {
            text: 'Close',
            style: 'cancel',
            onPress: () => setIsScannerOpen(false),
          },
        ]
      );
      return;
    }

    // Successfully detected
    setIsScannerOpen(false);
    setCodeInput(detectedCode);
    handleValidateAndPreview(detectedCode);
  };

  // Confirm Joining Group
  const handleConfirmJoin = async () => {
    if (!previewData?.code) return;

    if (previewData.isAlreadyMember) {
      router.replace(`/groups/${previewData.group.id}` as any);
      return;
    }

    setIsJoining(true);
    try {
      const result = joinGroupByCode(previewData.code);
      if (result.success && result.group) {
        const targetId = result.group.id;
        setPreviewData(null);
        // Immediate navigation to the group detail page
        router.replace(`/groups/${targetId}` as any);
      } else {
        showAlert('Cannot Join Group', result.message || 'Failed to join group.');
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'Something went wrong while joining the group.');
    } finally {
      setIsJoining(false);
    }
  };

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Join a Group
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter an invite code or scan a QR code shared by a group member.
        </Text>

        {/* Input Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.sm,
          ]}
        >
          <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>
            ENTER INVITE CODE
          </Text>

          <TextInput
            placeholder="e.g. GT-7K4P9X"
            placeholderTextColor={colors.textTertiary}
            value={codeInput}
            onChangeText={(text) => {
              setCodeInput(text.toUpperCase());
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surfaceElevated,
                borderColor: errorMessage ? colors.expense : colors.border,
              },
            ]}
          />

          {errorMessage && (
            <View style={styles.errorRow}>
              <AlertCircle size={15} color={colors.expense} />
              <Text style={[styles.errorText, { color: colors.expense }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleJoinPress}
            disabled={!codeInput.trim() || isValidating}
            activeOpacity={0.8}
            style={[
              styles.joinBtn,
              {
                backgroundColor: !codeInput.trim() || isValidating ? colors.border : colors.accent,
              },
            ]}
          >
            {isValidating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.joinBtnText}>Join Group</Text>
                <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.2} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* OR Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Scan QR Button */}
        <TouchableOpacity
          onPress={handleOpenScanner}
          activeOpacity={0.8}
          style={[
            styles.scanCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.sm,
          ]}
        >
          <View
            style={[
              styles.qrIconWrapper,
              { backgroundColor: colors.accentLight, borderColor: colors.accent },
            ]}
          >
            <QrCode size={26} color={colors.accent} strokeWidth={2.2} />
          </View>
          <View style={styles.scanTextWrapper}>
            <Text style={[styles.scanTitle, { color: colors.textPrimary }]}>
              Scan QR Code
            </Text>
            <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]}>
              Point camera at a Spendz invite QR code
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── GROUP PREVIEW MODAL ────────────────────────────────────── */}
      <Modal
        visible={Boolean(previewData)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewData(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.previewModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.lg,
            ]}
          >
            {/* Modal Header */}
            <View style={styles.previewHeader}>
              <View
                style={[
                  styles.previewIconBox,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
                ]}
              >
                <Text style={styles.previewEmoji}>{previewData?.group.icon || '🏖'}</Text>
              </View>

              <Text style={[styles.previewQuestion, { color: colors.textSecondary }]}>
                {previewData?.isAlreadyMember ? 'Already a Member' : 'Join Group?'}
              </Text>
              <Text style={[styles.previewGroupName, { color: colors.textPrimary }]}>
                {previewData?.group.name}
              </Text>

              <View style={styles.previewMemberCountRow}>
                <Users size={14} color={colors.textTertiary} />
                <Text style={[styles.previewMemberCountText, { color: colors.textSecondary }]}>
                  {previewData?.group.members?.length || 1} members
                </Text>
              </View>
            </View>

            {/* Member List Preview */}
            <View
              style={[
                styles.previewMembersContainer,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.previewMembersHeader, { color: colors.textTertiary }]}>
                MEMBERS
              </Text>
              <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                {previewData?.memberNames.map((name, idx) => (
                  <View key={idx} style={styles.previewMemberRow}>
                    <Avatar name={name} size={28} />
                    <Text style={[styles.previewMemberName, { color: colors.textPrimary }]}>
                      {name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {previewData?.isAlreadyMember ? (
              <View style={styles.alreadyMemberBanner}>
                <ShieldCheck size={16} color={colors.income} />
                <Text style={[styles.alreadyMemberText, { color: colors.income }]}>
                  You are already a member of this group.
                </Text>
              </View>
            ) : null}

            {/* Confirmation Buttons */}
            <View style={styles.previewActionButtons}>
              <TouchableOpacity
                onPress={() => setPreviewData(null)}
                style={[
                  styles.previewCancelBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.previewCancelText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmJoin}
                disabled={isJoining}
                style={[
                  styles.previewConfirmBtn,
                  { backgroundColor: colors.accent },
                  shadows.sm,
                ]}
                activeOpacity={0.8}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.previewConfirmText}>
                    {previewData?.isAlreadyMember ? 'Open Group' : 'Join Group'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── QR CODE SCANNER MODAL ────────────────────────────────────── */}
      <Modal
        visible={isScannerOpen}
        animationType="slide"
        onRequestClose={() => setIsScannerOpen(false)}
      >
        <CameraScanner
          onScan={handleBarcodeScanned}
          onClose={() => setIsScannerOpen(false)}
        />
      </Modal>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  joinBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  qrIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextWrapper: {
    flex: 1,
  },
  scanTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  scanSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  previewModalCard: {
    width: '100%',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  previewIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  previewEmoji: {
    fontSize: 28,
  },
  previewQuestion: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    marginBottom: 2,
  },
  previewGroupName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  previewMemberCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewMemberCountText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  previewMembersContainer: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewMembersHeader: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  previewMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  previewMemberName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  alreadyMemberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  alreadyMemberText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  previewActionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  previewCancelText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  previewConfirmBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: borderRadius.xl,
  },
  previewConfirmText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  // Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    zIndex: 10,
  },
  scannerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  cameraFrameWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#3B82F6',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  viewfinderInstructions: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  scannerFooter: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  scannerCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scannerCancelText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
