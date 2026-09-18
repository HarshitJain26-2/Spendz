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
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useCategoryStore } from '@/store/categoryStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { CategoryType } from '@/types';

const POPULAR_ICONS = [
  'UtensilsCrossed',
  'Coffee',
  'Car',
  'Fuel',
  'ShoppingBag',
  'Shirt',
  'Receipt',
  'Gamepad2',
  'Film',
  'GraduationCap',
  'Heart',
  'Pill',
  'Plane',
  'Gift',
  'Apple',
  'Home',
  'CreditCard',
  'Banknote',
  'Laptop',
  'Briefcase',
  'TrendingUp',
  'Sparkles',
  'Music',
  'Smile',
];

const PALETTE = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#A78BFA',
  '#F472B6',
  '#60A5FA',
  '#34D399',
  '#FB923C',
  '#E879F9',
  '#06B6D4',
  '#22C55E',
  '#F59E0B',
];

export default function AddCategoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const addCategory = useCategoryStore((s) => s.addCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [selectedIcon, setSelectedIcon] = useState('Sparkles');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    addCategory({
      name: name.trim(),
      type,
      icon: selectedIcon,
      color: selectedColor,
    });

    router.back();
  };

  const isValid = Boolean(name.trim());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            New Category
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Category Type Filter Pills */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              onPress={() => setType('expense')}
              style={[
                styles.typeBtn,
                {
                  backgroundColor:
                    type === 'expense'
                      ? colors.textPrimary
                      : colors.surface,
                  borderColor:
                    type === 'expense' ? colors.textPrimary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  {
                    color:
                      type === 'expense'
                        ? colors.surface
                        : colors.textSecondary,
                    fontFamily:
                      type === 'expense'
                        ? typography.fontFamily.semiBold
                        : typography.fontFamily.medium,
                  },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setType('income')}
              style={[
                styles.typeBtn,
                {
                  backgroundColor:
                    type === 'income'
                      ? colors.textPrimary
                      : colors.surface,
                  borderColor:
                    type === 'income' ? colors.textPrimary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  {
                    color:
                      type === 'income'
                        ? colors.surface
                        : colors.textSecondary,
                    fontFamily:
                      type === 'income'
                        ? typography.fontFamily.semiBold
                        : typography.fontFamily.medium,
                  },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <Card style={styles.formCard} padding="lg">
            {/* Live Preview */}
            <View style={styles.previewCenter}>
              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: `${selectedColor}15` },
                ]}
              >
                <DynamicIcon
                  name={selectedIcon}
                  size={28}
                  color={selectedColor}
                />
              </View>
              <Text style={[styles.previewLabel, { color: colors.textPrimary }]}>
                {name.trim() || 'Category Name'}
              </Text>
            </View>

            {/* Name Input */}
            <Input
              label="Category Name"
              placeholder="e.g., Gym, Pets, Side Gig"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </Card>

          {/* Icon Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SELECT ICON
            </Text>
          </View>
          <Card padding="md" style={styles.pickerCard}>
            <View style={styles.iconGrid}>
              {POPULAR_ICONS.map((icon) => {
                const isSelected = selectedIcon === icon;
                return (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isSelected
                          ? `${selectedColor}20`
                          : colors.surfaceElevated,
                        borderColor: isSelected
                          ? selectedColor
                          : 'transparent',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <DynamicIcon
                      name={icon}
                      size={20}
                      color={isSelected ? selectedColor : colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Color Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SELECT COLOR
            </Text>
          </View>
          <Card padding="md" style={styles.pickerCard}>
            <View style={styles.colorGrid}>
              {PALETTE.map((col) => {
                const isSelected = selectedColor === col;
                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setSelectedColor(col)}
                    style={[
                      styles.colorCircle,
                      {
                        backgroundColor: col,
                        borderColor: isSelected
                          ? colors.textPrimary
                          : 'transparent',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </ScrollView>

        {/* Submit */}
        <View style={[styles.bottom, { backgroundColor: colors.background }]}>
          <Button
            title="Create Category"
            onPress={handleSubmit}
            size="lg"
            fullWidth
            disabled={!isValid}
          />
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 40,
    gap: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 13,
  },
  formCard: {
    gap: spacing.md,
  },
  previewCenter: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  previewBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  pickerCard: {
    borderRadius: borderRadius.xl,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  colorCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
});
