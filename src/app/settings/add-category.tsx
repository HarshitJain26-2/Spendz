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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useCategoryStore } from '@/store/categoryStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
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
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            New Category
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Category Type Picker */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              onPress={() => setType('expense')}
              style={[
                styles.typeBtn,
                {
                  backgroundColor:
                    type === 'expense'
                      ? colors.accent
                      : colors.surfaceElevated,
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
                        ? '#FFFFFF'
                        : colors.textSecondary,
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
                      ? colors.accent
                      : colors.surfaceElevated,
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
                        ? '#FFFFFF'
                        : colors.textSecondary,
                  },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <Input
            label="Category Name"
            placeholder="e.g., Gym, Pets, Side Gig"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          {/* Icon Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Select Icon
            </Text>
          </View>
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
                        ? `${selectedColor}25`
                        : colors.surfaceElevated,
                      borderColor: isSelected
                        ? selectedColor
                        : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <DynamicIcon
                    name={icon}
                    size={22}
                    color={isSelected ? selectedColor : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Select Color
            </Text>
          </View>
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
        </ScrollView>

        {/* Submit */}
        <View style={styles.bottom}>
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
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  typeBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
});
