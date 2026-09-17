import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCategoryStore } from '@/store/categoryStore';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { showAlert } from '@/utils/alert';
import type { CategoryType } from '@/types';

export default function CategoriesManagementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const categories = useCategoryStore((s) => s.categories);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);

  const [activeTab, setActiveTab] = useState<CategoryType>('expense');

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleDelete = (id: string, name: string) => {
    showAlert(
      'Delete Category',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory(id),
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Categories
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/settings/add-category' as any)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Tab */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('expense')}
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                activeTab === 'expense'
                  ? colors.accent
                  : colors.surfaceElevated,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'expense'
                    ? '#FFFFFF'
                    : colors.textSecondary,
              },
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('income')}
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                activeTab === 'income'
                  ? colors.accent
                  : colors.surfaceElevated,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'income'
                    ? '#FFFFFF'
                    : colors.textSecondary,
              },
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.list}>
          {filteredCategories.map((cat) => (
            <View
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${cat.color}20` },
                ]}
              >
                <DynamicIcon name={cat.icon} size={20} color={cat.color} />
              </View>

              <View style={styles.categoryInfo}>
                <Text
                  style={[styles.categoryName, { color: colors.textPrimary }]}
                >
                  {cat.name}
                </Text>
                <Text
                  style={[styles.categoryType, { color: colors.textTertiary }]}
                >
                  {cat.isDefault ? 'Default' : 'Custom Category'}
                </Text>
              </View>

              {!cat.isDefault && (
                <TouchableOpacity
                  onPress={() => handleDelete(cat.id, cat.name)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={colors.expense} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.small,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    paddingTop: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  categoryType: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.tiny,
  },
  deleteBtn: {
    padding: 6,
  },
});
