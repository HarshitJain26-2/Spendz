import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { Category } from '@/types';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedId,
  onSelect,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Category
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {categories.map((category) => {
          const isSelected = selectedId === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => onSelect(category)}
              activeOpacity={0.7}
              style={[
                styles.item,
                {
                  backgroundColor: isSelected
                    ? `${category.color}20`
                    : colors.surface,
                  borderColor: isSelected ? category.color : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <DynamicIcon
                name={category.icon}
                size={20}
                color={isSelected ? category.color : colors.textSecondary}
              />
              <Text
                style={[
                  styles.itemLabel,
                  {
                    color: isSelected ? category.color : colors.textPrimary,
                  },
                ]}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  itemLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
});
