import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';
import type { Category } from '@/types';

// Category emoji helper matching modern reference
const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍔',
  transport: '🚕',
  shopping: '🛍️',
  bills: '🧾',
  entertainment: '🎮',
  education: '🎓',
  health: '🏥',
  travel: '✈️',
  gifts: '🎁',
  friends: '👥',
  other: '📦',
  salary: '💰',
  freelance: '💻',
  investment: '📈',
  refund: '↩️',
};

export const getCategoryEmoji = (id?: string | null, name?: string): string => {
  if (!id && !name) return '🏷️';
  const lowerId = (id || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lowerId.includes(key) || lowerName.includes(key)) {
      return emoji;
    }
  }
  return '🏷️';
};

interface CategorySelectorCardProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  onOpen?: () => void;
  style?: ViewStyle;
}

export const CategorySelectorCard: React.FC<CategorySelectorCardProps> = ({
  categories,
  selectedId,
  onSelect,
  onOpen,
  style,
}) => {
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedId) || categories[0];
  const emoji = getCategoryEmoji(selectedCategory?.id, selectedCategory?.name);

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          onOpen?.();
          setSheetVisible(true);
        }}
        activeOpacity={0.7}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            CATEGORY
          </Text>
          <Text
            style={[styles.value, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {selectedCategory?.name || 'Select Category'}
          </Text>
        </View>

        <View style={styles.rightWrap}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              Primary
            </Text>
          </View>
          <ChevronDown size={18} color={colors.textTertiary} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        height={460}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Select Category
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScroll}
        >
          {categories.map((category) => {
            const isSelected = selectedCategory?.id === category.id;
            const catEmoji = getCategoryEmoji(category.id, category.name);

            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => {
                  onSelect(category);
                  setSheetVisible(false);
                }}
                activeOpacity={0.7}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: isSelected
                      ? colors.surfaceElevated
                      : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: `${category.color}15` },
                  ]}
                >
                  <Text style={styles.optionEmoji}>{catEmoji}</Text>
                </View>
                <Text
                  style={[
                    styles.optionName,
                    { color: colors.textPrimary },
                  ]}
                >
                  {category.name}
                </Text>
                {isSelected && (
                  <Check size={18} color={colors.accent} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontFamily: typography.fontFamily.semiBold,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
  },
  sheetHeader: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECE6',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
  sheetScroll: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionName: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
  },
});
