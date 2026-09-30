import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Info,
  Trash2,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Stable selectors from Zustand
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  // Preload current values
  const [fullName, setFullName] = useState(
    userProfile.fullName || userProfile.name || ''
  );
  const [email, setEmail] = useState(userProfile.email || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(
    userProfile.avatarUri || null
  );

  // Errors state
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const validate = () => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPhoneError('');

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setNameError('Full name is required');
      isValid = false;
    } else if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email address');
        isValid = false;
      }
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      // Allow phone characters +, digits, spaces, dashes
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setPhoneError('Please enter a valid phone number');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSave = () => {
    if (!validate()) return;

    setIsSaving(true);
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    // Persistent update & immediate Zustand update
    setUserProfile({
      fullName: trimmedName,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      avatarUri: avatarUri || null,
    });

    setIsSaving(false);
    router.back();
  };

  const handleRemovePhoto = () => {
    setAvatarUri(null);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* 1. Header: [Back] Edit Profile */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[
            styles.backButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Edit Profile
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 2. Avatar Preview Card */}
          <Card style={styles.avatarCard} padding="lg">
            <View style={styles.avatarContainer}>
              <Avatar
                name={fullName.trim() || 'You'}
                avatarUri={avatarUri}
                size={88}
              />
            </View>

            <Text style={[styles.previewName, { color: colors.textPrimary }]}>
              {fullName.trim() || 'Your Name'}
            </Text>
            <Text style={[styles.previewSub, { color: colors.textTertiary }]}>
              Avatar preview updates dynamically as you type
            </Text>

            {avatarUri ? (
              <TouchableOpacity
                onPress={handleRemovePhoto}
                style={[
                  styles.removePhotoBtn,
                  { borderColor: colors.expenseLight, backgroundColor: colors.surfaceElevated },
                ]}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color={colors.expense} />
                <Text style={[styles.removePhotoText, { color: colors.expense }]}>
                  Remove Custom Photo
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Dependency Note Card */}
            <View
              style={[
                styles.noticeBanner,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Info size={16} color={colors.accent} style={styles.noticeIcon} />
              <View style={styles.noticeTextGroup}>
                <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>
                  Profile Avatar Notice
                </Text>
                <Text style={[styles.noticeDesc, { color: colors.textSecondary }]}>
                  Custom device photo selection requires the <Text style={{ fontFamily: typography.fontFamily.semiBold }}>expo-image-picker</Text> library. Spendz generates consistent initials based on your name.
                </Text>
              </View>
            </View>
          </Card>

          {/* 3. Personal Details Form */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PERSONAL DETAILS
            </Text>
          </View>

          <Card padding="lg" style={styles.formCard}>
            <Input
              label="Full Name"
              placeholder="e.g., Harshit Jain"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (nameError) setNameError('');
              }}
              error={nameError}
              autoCapitalize="words"
              leftIcon={<User size={18} color={colors.textTertiary} />}
            />

            <Input
              label="Email Address"
              placeholder="e.g., harshit@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={18} color={colors.textTertiary} />}
            />

            <Input
              label="Phone Number"
              placeholder="e.g., +91 98765 43210"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (phoneError) setPhoneError('');
              }}
              error={phoneError}
              keyboardType="phone-pad"
              leftIcon={<Phone size={18} color={colors.textTertiary} />}
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          {/* 4. Action Buttons */}
          <View style={styles.actions}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              size="lg"
              loading={isSaving}
              fullWidth
              icon={<CheckCircle2 size={18} color="#FFFFFF" />}
            />

            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="ghost"
              size="md"
              fullWidth
              style={styles.cancelBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerRightPlaceholder: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing['4xl'],
  },
  avatarCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.sm,
  },
  previewName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginBottom: 2,
    textAlign: 'center',
  },
  previewSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  removePhotoText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  noticeBanner: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    width: '100%',
    gap: spacing.sm,
  },
  noticeIcon: {
    marginTop: 2,
  },
  noticeTextGroup: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.bodySmall,
    marginBottom: 2,
  },
  noticeDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  actions: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  cancelBtn: {
    marginTop: 2,
  },
});
