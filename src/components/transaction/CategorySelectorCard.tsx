import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  type ViewStyle,
} from 'react-native';
import {
  ChevronDown,
  Check,
  Search,
  Plus,
  ArrowLeft,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useCategoryStore } from '@/store/categoryStore';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';
import { showAlert } from '@/utils/alert';
import type { Category } from '@/types';

// Category emoji helper matching modern reference
const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍔',
  dining: '🍽️',
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
  gym: '🏋️',
  fitness: '💪',
  workout: '🏋️',
  coffee: '☕',
  groceries: '🍎',
  rent: '🏠',
  subscriptions: '💳',
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

const POPULAR_ICONS = [
  'Dumbbell',
  'UtensilsCrossed',
  'Coffee',
  'Car',
  'Fuel',
  'ShoppingBag',
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

interface CategorySelectorCardProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
  style?: ViewStyle;
}

export const CategorySelectorCard: React.FC<CategorySelectorCardProps> = ({
  categories,
  selectedId,
  onSelect,
  isOpen,
  onOpenChange,
  onOpen,
  style,
}) => {
  const { colors } = useTheme();
  const [internalVisible, setInternalVisible] = useState(false);

  const isControlled = isOpen !== undefined;
  const sheetVisible = isControlled ? Boolean(isOpen) : internalVisible;

  const setSheetVisible = (visible: boolean) => {
    if (isControlled) {
      onOpenChange?.(visible);
    } else {
      setInternalVisible(visible);
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Dumbbell');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);

  const selectedCategory = categories.find((c) => c.id === selectedId) || categories[0];
  const emoji = getCategoryEmoji(selectedCategory?.id, selectedCategory?.name);

  // Filtered categories
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleOpenSheet = () => {
    onOpen?.();
    setSearchQuery('');
    setIsCreating(false);
    setSheetVisible(true);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setIsCreating(false);
    setSearchQuery('');
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewName(searchQuery.trim());
    setSelectedIcon('Dumbbell');
    setSelectedColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  };

  const handleSaveCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert('Required', 'Please enter a category name.');
      return;
    }

    // Case-insensitive duplicate check
    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      showAlert(
        'Category Already Exists',
        `A category named "${existing.name}" already exists.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Select Existing',
            onPress: () => {
              onSelect(existing);
              handleCloseSheet();
            },
          },
        ]
      );
      return;
    }

    // Add category through existing categoryStore
    const newCategory = useCategoryStore.getState().addCategory({
      name: trimmed,
      icon: selectedIcon,
      color: selectedColor,
      type: 'expense',
    });

    // Auto-select newly created category and close UI
    onSelect(newCategory);
    handleCloseSheet();
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleOpenSheet}
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
        onClose={handleCloseSheet}
        height={560}
      >
        {!isCreating ? (
          /* Normal Category Selection List View */
          <View style={styles.sheetContainer}>
            {/* Sheet Header */}
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Select Category
              </Text>
              <TouchableOpacity
                onPress={handleStartCreate}
                activeOpacity={0.7}
                style={[styles.addHeaderBtn, { backgroundColor: colors.accentLight }]}
              >
                <Plus size={16} color={colors.accent} strokeWidth={2.6} />
                <Text style={[styles.addHeaderBtnText, { color: colors.accent }]}>
                  Add Category
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={18} color={colors.textTertiary} style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search categories..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Categories ScrollView */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCategories.map((category) => {
                const isSelected = selectedCategory?.id === category.id;
                const catEmoji = getCategoryEmoji(category.id, category.name);

                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => {
                      onSelect(category);
                      handleCloseSheet();
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

              {/* In-list + Add Category Option */}
              <TouchableOpacity
                onPress={handleStartCreate}
                activeOpacity={0.7}
                style={[
                  styles.addOptionItem,
                  {
                    borderColor: colors.accent,
                    backgroundColor: `${colors.accent}08`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Plus size={20} color={colors.accent} strokeWidth={2.6} />
                </View>
                <Text style={[styles.addOptionText, { color: colors.accent }]}>
                  + Add "{searchQuery.trim() || 'New Category'}"
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          /* Inline Category Creation View (Preserves Draft State) */
          <View style={styles.sheetContainer}>
            {/* Header with back navigation */}
            <View style={styles.sheetHeaderRow}>
              <TouchableOpacity
                onPress={() => setIsCreating(false)}
                activeOpacity={0.7}
                style={styles.backBtn}
              >
                <ArrowLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Add Category
              </Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.createScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category Name Input */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                CATEGORY NAME
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Gym, Books, Gaming"
                placeholderTextColor={colors.textTertiary}
                autoFocus
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />

              {/* Icon Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
                SELECT ICON
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconPickerRow}
              >
                {POPULAR_ICONS.map((iconName) => {
                  const isSelected = selectedIcon === iconName;
                  return (
                    <TouchableOpacity
                      key={iconName}
                      onPress={() => setSelectedIcon(iconName)}
                      activeOpacity={0.7}
                      style={[
                        styles.iconChoice,
                        {
                          backgroundColor: isSelected
                            ? colors.accentLight
                            : colors.surfaceElevated,
                          borderColor: isSelected ? colors.accent : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                    >
                      <DynamicIcon
                        name={iconName}
                        size={20}
                        color={isSelected ? colors.accent : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Color Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
                COLOR
              </Text>
              <View style={styles.colorPickerRow}>
                {PALETTE.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.7}
                      style={[
                        styles.colorChoice,
                        { backgroundColor: c },
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#000000" strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.createActionsRow}>
                <TouchableOpacity
                  onPress={() => setIsCreating(false)}
                  activeOpacity={0.7}
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveCategory}
                  activeOpacity={0.8}
                  disabled={!newName.trim()}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.accent,
                      opacity: newName.trim() ? 1 : 0.6,
                    },
                  ]}
                >
                  <Text style={styles.saveBtnText}>
                    Add Category
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
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
  sheetContainer: {
    flex: 1,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
  backBtn: {
    padding: spacing.xs,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  addHeaderBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    paddingVertical: spacing.xs,
  },
  sheetScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    paddingBottom: spacing['2xl'],
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
  addOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  addOptionText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  createScroll: {
    paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
  },
  iconPickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  colorChoice: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
});
