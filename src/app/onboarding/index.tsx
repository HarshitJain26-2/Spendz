import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Wallet } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        {/* Hero Icon */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(600)}
          style={[styles.iconContainer, { backgroundColor: colors.accentLight }]}
        >
          <Wallet size={48} color={colors.accent} strokeWidth={1.5} />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Spendz
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)}>
          <Text style={[styles.tagline, { color: colors.accent }]}>
            Know your money.
          </Text>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(800).duration(600)}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            A simple, beautiful way to know where your{'\n'}money went and who owes you.
          </Text>
        </Animated.View>
      </View>

      {/* CTA */}
      <Animated.View
        entering={FadeInUp.delay(1000).duration(600)}
        style={styles.bottom}
      >
        <Button
          title="Get Started"
          onPress={() => router.push('/onboarding/setup')}
          size="lg"
          fullWidth
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 48,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h2,
    marginBottom: spacing.xl,
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.body,
    textAlign: 'center',
  },
  bottom: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
});
