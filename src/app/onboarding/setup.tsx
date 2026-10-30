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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AmountInput } from '@/components/ui/AmountInput';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/accountStore';
import { ACCOUNT_TYPES, type AccountTypeConfig } from '@/constants/accountTypes';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SetupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const userProfile = useAppStore((s) => s.userProfile);
  const authUser = useAuthStore((s) => s.user);
  const addAccount = useAccountStore((s) => s.addAccount);

  const metaName =
    authUser?.user_metadata?.full_name?.trim() ||
    authUser?.user_metadata?.name?.trim() ||
    '';

  const profileName =
    userProfile.fullName && userProfile.fullName !== 'User'
      ? userProfile.fullName.trim()
      : userProfile.name && userProfile.name !== 'User'
      ? userProfile.name.trim()
      : '';

  const existingName = profileName || metaName || '';

  const [name, setName] = useState(existingName);
  const [selectedType, setSelectedType] = useState<AccountTypeConfig>(
    ACCOUNT_TYPES[0]
  );
  const [balance, setBalance] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleContinue = () => {
    if (!accountName.trim()) return;

    // Save user profile with resolved name
    const finalName = name.trim() || existingName.trim() || 'User';
    setUserProfile({
      name: finalName,
      fullName: finalName,
    });

    // Create first account
    addAccount({
      name: accountName.trim(),
      type: selectedType.type,
      balance: parseFloat(balance) || 0,
      icon: selectedType.icon,
      color: selectedType.color,
      isDefault: true,
    });

    setHasOnboarded(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {existingName ? `Welcome, ${existingName}!` : 'Set up your first account'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {existingName
                ? "Let's set up your first account to start tracking your money. You can add more accounts later."
                : "Let's start tracking your money. You can add more accounts later."}
            </Text>
          </Animated.View>

          {/* Name Input - only show if name was not provided during account creation */}
          {!existingName && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <Input
                label="Your Name"
                placeholder="What should we call you?"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </Animated.View>
          )}

          {/* Account Name */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Input
              label="Account Name"
              placeholder="e.g., Cash, SBI Savings, Paytm"
              value={accountName}
              onChangeText={setAccountName}
              autoCapitalize="words"
            />
          </Animated.View>

          {/* Account Type */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Account Type
            </Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((type) => {
                const isSelected = selectedType.type === type.type;
                return (
                  <TouchableOpacity
                    key={type.type}
                    onPress={() => setSelectedType(type)}
                    activeOpacity={0.7}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: isSelected
                          ? `${type.color}15`
                          : colors.surface,
                        borderColor: isSelected ? type.color : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <DynamicIcon
                      name={type.icon}
                      size={24}
                      color={isSelected ? type.color : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: isSelected
                            ? type.color
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: type.color },
                        ]}
                      >
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Starting Balance */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Starting Balance
            </Text>
            <View
              style={[
                styles.balanceContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <AmountInput
                value={balance}
                onChangeText={setBalance}
                autoFocus={false}
              />
            </View>
          </Animated.View>
        </ScrollView>

        {/* CTA */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(500)}
          style={styles.bottom}
        >
          <Button
            title="Continue"
            onPress={handleContinue}
            size="lg"
            fullWidth
            disabled={!accountName.trim()}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.body,
    marginBottom: spacing['3xl'],
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
    marginBottom: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  typeCard: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    position: 'relative',
  },
  typeLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    marginTop: spacing.sm,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing['2xl'],
  },
  bottom: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
});
