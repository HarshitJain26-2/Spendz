import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatAuthError } from '@/utils/authErrors';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Success state for email confirmation
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  const validate = (): boolean => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setNameError('Full name is required.');
      isValid = false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Enter a valid email address.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Enter a valid email address.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleSignUp = async () => {
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
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            name: trimmedName,
          },
        },
      });

      if (error) {
        setGeneralError(formatAuthError(error));
        setIsSubmitting(false);
        return;
      }

      // Check if session was returned directly or email confirmation is required
      if (data.session) {
        // Authenticated immediately
        setUserProfile({
          id: data.user?.id,
          fullName: trimmedName,
          name: trimmedName,
          email: trimmedEmail,
        });
        const dest = useAuthStore.getState().intendedDestination;
        if (dest) {
          useAuthStore.getState().setIntendedDestination(null);
          router.replace(dest as any);
        } else {
          router.replace('/');
        }
      } else if (data.user) {
        // Provider requires email confirmation
        setEmailConfirmationRequired(true);
      }
    } catch (e: any) {
      setGeneralError(formatAuthError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailConfirmationRequired) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.confirmationContent}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={[styles.successIconWrapper, { backgroundColor: colors.incomeLight }]}
          >
            <CheckCircle2 size={48} color={colors.income} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Account Created</Text>
          <Text style={[styles.confirmationSubtitle, { color: colors.textSecondary }]}>
            Check your email to verify your account.{'\n'}Once verified, sign in to start using Spendz.
          </Text>

          <Button
            title="Back to Sign In"
            onPress={() => router.replace('/auth/sign-in')}
            size="lg"
            fullWidth
            style={styles.backToSignInButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
            <View style={styles.logoWrapper}>
              <Image
                source={require('@/assets/images/spendz-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Create your Spendz account
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Start tracking your expenses and splits seamlessly.
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

          {/* Form Fields */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.form}>
            {/* Full Name */}
            <Input
              label="Full Name"
              placeholder="e.g. Harshit Jain"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (nameError) setNameError('');
                if (generalError) setGeneralError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              error={nameError || undefined}
              leftIcon={<User size={20} color={colors.textTertiary} />}
            />

            {/* Email Input */}
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
              returnKeyType="next"
              error={emailError || undefined}
              leftIcon={<Mail size={20} color={colors.textTertiary} />}
            />

            {/* Password Input */}
            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
                if (generalError) setGeneralError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              error={passwordError || undefined}
              leftIcon={<Lock size={20} color={colors.textTertiary} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textTertiary} />
                  ) : (
                    <Eye size={20} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Confirm Password Input */}
            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError('');
                if (generalError) setGeneralError(null);
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              error={confirmPasswordError || undefined}
              leftIcon={<Lock size={20} color={colors.textTertiary} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.textTertiary} />
                  ) : (
                    <Eye size={20} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Create Account Button */}
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="lg"
              fullWidth
              style={styles.signUpButton}
            />
          </Animated.View>

          {/* Footer - Sign In Link */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-in')} activeOpacity={0.7}>
              <Text style={[styles.signInLink, { color: colors.accent }]}>Sign In</Text>
            </TouchableOpacity>
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
  logoWrapper: {
    marginBottom: spacing.lg,
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
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
    lineHeight: typography.lineHeight.body,
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
  signUpButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  footerText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
  },
  signInLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  confirmationContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  confirmationSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  backToSignInButton: {
    marginTop: spacing.md,
  },
});
