import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCategoryStore } from '@/store/categoryStore';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { Card } from '@/components/ui/Card';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
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
      edges={['top', 'left', 'right']}
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
          Categories
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/settings/add-category' as any)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#000000" strokeWidth={2.4} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('expense')}
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                activeTab === 'expense'
                  ? colors.textPrimary
                  : colors.surface,
              borderColor:
                activeTab === 'expense' ? colors.textPrimary : colors.border,
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
                    ? colors.surface
                    : colors.textSecondary,
                fontFamily:
                  activeTab === 'expense'
                    ? typography.fontFamily.semiBold
                    : typography.fontFamily.medium,
              },
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('income')}
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                activeTab === 'income'
                  ? colors.textPrimary
                  : colors.surface,
              borderColor:
                activeTab === 'income' ? colors.textPrimary : colors.border,
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
                    ? colors.surface
                    : colors.textSecondary,
                fontFamily:
                  activeTab === 'income'
                    ? typography.fontFamily.semiBold
                    : typography.fontFamily.medium,
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
        <Card padding="none" style={styles.groupedCard}>
          {filteredCategories.map((cat, index) => (
            <View key={cat.id}>
              <View style={styles.categoryRow}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${cat.color}15` },
                  ]}
                >
                  <DynamicIcon name={cat.icon} size={20} color={cat.color} />
                </View>

                <Text
                  style={[styles.categoryName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>

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

              {index < filteredCategories.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </Card>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  addBtnText: {
    color: '#000000',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  groupedCard: {
    borderRadius: borderRadius.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    flex: 1,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
});
