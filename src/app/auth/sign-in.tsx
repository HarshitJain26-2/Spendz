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
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatAuthError } from '@/utils/authErrors';
import { useAuthStore } from '@/store/authStore';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const intendedDestination = useAuthStore((s) => s.intendedDestination);
  const setIntendedDestination = useAuthStore((s) => s.setIntendedDestination);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError(null);

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
    }

    return isValid;
  };

  const handleSignIn = async () => {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setGeneralError(formatAuthError(error));
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        // Successful authentication
        if (intendedDestination) {
          const dest = intendedDestination;
          setIntendedDestination(null);
          router.replace(dest as any);
        } else {
          router.replace('/');
        }
      }
    } catch (e: any) {
      setGeneralError(formatAuthError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* Spendz Branding Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('@/assets/images/spendz-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to continue managing your money.
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
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
                if (generalError) setGeneralError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
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

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                onPress={() => router.push('/auth/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="lg"
              fullWidth
              style={styles.signInButton}
            />
          </Animated.View>

          {/* Footer - Create Account Link */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')} activeOpacity={0.7}>
              <Text style={[styles.signUpLink, { color: colors.accent }]}>Create account</Text>
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
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoWrapper: {
    marginBottom: spacing.xl,
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  signInButton: {
    marginTop: spacing.xs,
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
  signUpLink: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
});
