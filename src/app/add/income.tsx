import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, ArrowDownRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { CategorySelectorCard } from '@/components/transaction/CategorySelectorCard';
import { AccountSelectorCard } from '@/components/transaction/AccountSelectorCard';
import { DateTimeCards } from '@/components/transaction/DateTimeCards';
import { NoteCard } from '@/components/transaction/NoteCard';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { numberToWords } from '@/utils/numberToWords';
import { formatCurrency } from '@/utils/currency';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAccountStore } from '@/store/accountStore';
import { useAppStore } from '@/store/appStore';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

export default function AddIncomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userProfile = useAppStore((s) => s.userProfile);

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const categories = useCategoryStore((s) => s.categories);
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );
  const accounts = useAccountStore((s) => s.accounts);

  const [amount, setAmount] = useState('25000');
  const [categoryId, setCategoryId] = useState<string | null>(
    incomeCategories[0]?.id || null
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('Monthly Salary');

  const handleKeyPress = (key: string) => {
    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount((prev) => (prev ? `${prev}.` : '0.'));
      return;
    }

    if (amount === '0') {
      setAmount(key);
      return;
    }

    const parts = amount.split('.');
    if (parts[1] && parts[1].length >= 2) return;
    if (amount.length >= 8) return;

    setAmount((prev) => `${prev}${key}`);
  };

  const handleDelete = () => {
    setAmount((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  };

  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(Math.round(current + val).toString());
  };

  const handleRoundOff = () => {
    const current = parseFloat(amount) || 0;
    if (current <= 0) return;
    const rounded = Math.ceil(current / 100) * 100;
    setAmount((rounded === current ? rounded + 100 : rounded).toString());
  };

  const handleResetDraft = () => {
    setAmount('');
    setNote('');
    if (incomeCategories[0]) setCategoryId(incomeCategories[0].id);
    if (accounts[0]) setAccountId(accounts[0].id);
    setDate(getTodayISO());
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0 && Boolean(accountId);

  const handleSubmit = () => {
    if (!isValid) return;

    addTransaction({
      type: 'income',
      amount: parsedAmount,
      categoryId,
      accountId,
      note: note.trim() || 'Income',
      date,
    });

    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleGroup}>
          <Image
            source={require('@/assets/images/spendz-logo.png')}
            style={styles.logoBadge}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            New Income
          </Text>
        </View>

        <Avatar name={userProfile.name || 'You'} size={36} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Sub-Header */}
        <View style={styles.subHeader}>
          <View
            style={[
              styles.quickEntryPill,
              { backgroundColor: colors.incomeLight },
            ]}
          >
            <Text
              style={[styles.quickEntryText, { color: colors.income }]}
            >
              INCOMING
            </Text>
            <View style={[styles.mintDot, { backgroundColor: colors.income }]} />
          </View>

          <TouchableOpacity
            onPress={handleResetDraft}
            activeOpacity={0.7}
            style={styles.resetBtn}
          >
            <RotateCcw size={14} color={colors.textSecondary} />
            <Text style={[styles.resetText, { color: colors.textSecondary }]}>
              Reset draft
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Hero Amount Card */}
        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.sm,
          ]}
        >
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            Enter Income Received
          </Text>

          <View style={styles.amountDisplayRow}>
            <Text style={[styles.amountCurrency, { color: colors.income }]}>
              +₹
            </Text>
            <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
              {amount || '0'}
            </Text>
            <View style={[styles.cursor, { backgroundColor: colors.income }]} />
          </View>

          <Text style={[styles.inWordsText, { color: colors.textTertiary }]}>
            {numberToWords(parsedAmount)}
          </Text>

          {/* Quick Shortcuts */}
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              onPress={() => handleAddQuickAmount(1000)}
              activeOpacity={0.7}
              style={[
                styles.shortcutChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.shortcutText, { color: colors.textPrimary }]}
              >
                +₹1,000
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAddQuickAmount(5000)}
              activeOpacity={0.7}
              style={[
                styles.shortcutChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.shortcutText, { color: colors.textPrimary }]}
              >
                +₹5,000
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAddQuickAmount(10000)}
              activeOpacity={0.7}
              style={[
                styles.shortcutChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.shortcutText, { color: colors.textPrimary }]}
              >
                +₹10,000
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRoundOff}
              activeOpacity={0.7}
              style={[
                styles.roundOffChip,
                { backgroundColor: colors.incomeLight },
              ]}
            >
              <Text style={[styles.roundOffText, { color: colors.income }]}>
                Round off
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Category Selector Card */}
        <CategorySelectorCard
          categories={incomeCategories}
          selectedId={categoryId}
          onSelect={(c) => setCategoryId(c.id)}
        />

        {/* 5. Received In Account */}
        <AccountSelectorCard
          accounts={accounts}
          selectedId={accountId}
          label="RECEIVED IN"
          onSelect={(a) => setAccountId(a.id)}
        />

        {/* 6. Date & Time Cards */}
        <DateTimeCards
          date={date}
          onChangeDate={setDate}
        />

        {/* 7. Note Card */}
        <NoteCard
          value={note}
          placeholder="e.g., Monthly salary, Freelance payment"
          onChangeText={setNote}
        />

        {/* 8. Numeric Keypad */}
        <NumericKeypad
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          style={styles.keypad}
        />
      </ScrollView>

      {/* 9. Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8),
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}
          style={[
            styles.saveButton,
            {
              backgroundColor: isValid ? colors.income : colors.surfaceElevated,
            },
            shadows.md,
          ]}
        >
          <View style={styles.saveLeft}>
            <ArrowDownRight size={20} color={isValid ? '#FFFFFF' : colors.textTertiary} strokeWidth={2.4} />
            <Text
              style={[
                styles.saveTitle,
                { color: isValid ? '#FFFFFF' : colors.textTertiary },
              ]}
            >
              Save Income Entry
            </Text>
          </View>

          <View
            style={[
              styles.saveDivider,
              { backgroundColor: isValid ? 'rgba(255,255,255,0.25)' : colors.border },
            ]}
          />

          <Text
            style={[
              styles.saveTotal,
              { color: isValid ? '#FFFFFF' : colors.textTertiary },
            ]}
          >
            TOTAL {formatCurrency(parsedAmount)}
          </Text>
        </TouchableOpacity>
      </View>
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
  backBtn: {
    padding: spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  quickEntryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  quickEntryText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  mintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
  },
  amountCard: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCurrency: {
    fontSize: 28,
    fontFamily: typography.fontFamily.bold,
    marginRight: 2,
  },
  amountValue: {
    fontSize: 40,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: -1,
  },
  cursor: {
    width: 3,
    height: 34,
    marginLeft: 4,
    borderRadius: 1.5,
  },
  inWordsText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    justifyContent: 'space-between',
  },
  shortcutChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.semiBold,
  },
  roundOffChip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOffText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.semiBold,
  },
  keypad: {
    marginTop: spacing.xs,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    minHeight: 56,
  },
  saveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.bold,
  },
  saveDivider: {
    width: 1,
    height: 20,
    marginHorizontal: spacing.sm,
  },
  saveTotal: {
    fontSize: 14,
    fontFamily: typography.fontFamily.bold,
  },
});
