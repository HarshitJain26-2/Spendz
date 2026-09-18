import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface PageHeaderProps {
  // Brand row options
  showBrandLogo?: boolean;
  brandSubtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;

  // Title row options
  title?: string;
  titleBadge?: React.ReactNode;
  titleRight?: React.ReactNode;
  greeting?: string;

  style?: ViewStyle;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  showBrandLogo = false,
  brandSubtitle,
  showBackButton = false,
  onBack,
  headerLeft,
  headerRight,
  title,
  titleBadge,
  titleRight,
  greeting,
  style,
}) => {
  const router = useRouter();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const hasTopRow =
    showBrandLogo || showBackButton || headerLeft !== undefined || headerRight !== undefined;
  const hasTitleRow = Boolean(title || greeting || titleRight || titleBadge);

  return (
    <View style={[styles.container, style]}>
      {/* 1. Top Navigation / Brand Bar */}
      {hasTopRow && (
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            {showBackButton && (
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                style={styles.backButton}
              >
                <ArrowLeft size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}

            {showBrandLogo && (
              <View style={styles.brandGroup}>
                <Image
                  source={require('@/assets/images/spendz-logo.png')}
                  style={styles.logoBadge}
                  resizeMode="contain"
                />
                <View>
                  <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
                    Spendz
                  </Text>
                  {brandSubtitle ? (
                    <Text style={[styles.brandSubtitle, { color: colors.textTertiary }]}>
                      {brandSubtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            {headerLeft}
          </View>

          {headerRight && <View style={styles.topRight}>{headerRight}</View>}
        </View>
      )}

      {/* 2. Optional Greeting */}
      {greeting ? (
        <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
          {greeting}
        </Text>
      ) : null}

      {/* 3. Page Title & Action Row */}
      {hasTitleRow && (title || titleRight || titleBadge) && (
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            {title ? (
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                {title}
              </Text>
            ) : null}
            {titleBadge}
          </View>
          {titleRight && <View style={styles.titleRight}>{titleRight}</View>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: spacing.xs,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: 2,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  brandTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  greetingText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 22,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
