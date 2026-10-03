import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatAuthError } from '@/utils/authErrors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    setEmailError('');
    setGeneralError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Enter a valid email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    if (!isSupabaseConfigured()) {
      setGeneralError(
        'Supabase is not configured yet. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      // Create cross-platform redirect URL
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth/sign-in`
          : Linking.createURL('/auth/sign-in');

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setGeneralError(formatAuthError(error));
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch (e: any) {
      setGeneralError(formatAuthError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContent}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={[styles.iconWrapper, { backgroundColor: colors.incomeLight }]}
          >
            <CheckCircle2 size={48} color={colors.income} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Password reset instructions have been sent to your email.
          </Text>

          <Button
            title="Return to Sign In"
            onPress={() => router.replace('/auth/sign-in')}
            size="lg"
            fullWidth
            style={styles.returnButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Top Header with Back Button */}
      <View style={styles.topBar}>
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
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
            <View
              style={[styles.iconWrapper, { backgroundColor: colors.accentLight }]}
            >
              <KeyRound size={36} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Forgot your password?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we'll send you a password reset link.
            </Text>
          </Animated.View>

          {/* General Error Banner */}
          {!!generalError && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[
                styles.errorBanner,
                { backgroundColor: colors.expenseLight, borderColor: colors.expense },
              ]}
            >
              <AlertCircle size={18} color={colors.expense} style={styles.errorBannerIcon} />
              <Text style={[styles.errorBannerText, { color: colors.expense }]}>
                {generalError}
              </Text>
            </Animated.View>
          )}

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.form}>
            <Input
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
                if (generalError) setGeneralError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
              error={emailError || undefined}
              leftIcon={<Mail size={20} color={colors.textTertiary} />}
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="lg"
              fullWidth
              style={styles.resetButton}
            />
          </Animated.View>
        </ScrollView>
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
  topBar: {
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h1,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  errorBannerIcon: {
    marginRight: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  form: {
    width: '100%',
  },
  resetButton: {
    marginTop: spacing.md,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  returnButton: {
    marginTop: spacing['2xl'],
  },
});
