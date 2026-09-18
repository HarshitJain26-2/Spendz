import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowDown, ArrowLeftRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { AccountSelectorCard } from '@/components/transaction/AccountSelectorCard';
import { DateTimeCards } from '@/components/transaction/DateTimeCards';
import { NoteCard } from '@/components/transaction/NoteCard';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { numberToWords } from '@/utils/numberToWords';
import { formatCurrency } from '@/utils/currency';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';
import { useAppStore } from '@/store/appStore';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

export default function AddTransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userProfile = useAppStore((s) => s.userProfile);

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const accounts = useAccountStore((s) => s.accounts);

  const [amount, setAmount] = useState('2000');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(
    accounts.length > 1 ? accounts[1]?.id : accounts[0]?.id || ''
  );
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('ATM withdrawal');

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

  const parsedAmount = parseFloat(amount) || 0;
  const isValid =
    parsedAmount > 0 &&
    Boolean(fromAccountId) &&
    Boolean(toAccountId) &&
    fromAccountId !== toAccountId;

  const handleSubmit = () => {
    if (fromAccountId === toAccountId) {
      Alert.alert(
        'Invalid Transfer',
        'Source and destination accounts must be different.'
      );
      return;
    }

    if (!isValid) return;

    addTransaction({
      type: 'transfer',
      amount: parsedAmount,
      categoryId: null,
      accountId: fromAccountId,
      toAccountId: toAccountId,
      note: note.trim() || 'Account Transfer',
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
            Transfer Money
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
              { backgroundColor: colors.transferLight },
            ]}
          >
            <Text
              style={[styles.quickEntryText, { color: colors.transfer }]}
            >
              TRANSFER • BETWEEN ACCOUNTS
            </Text>
          </View>
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
            Enter Transfer Amount
          </Text>

          <View style={styles.amountDisplayRow}>
            <Text style={[styles.amountCurrency, { color: colors.transfer }]}>
              ₹
            </Text>
            <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
              {amount || '0'}
            </Text>
            <View style={[styles.cursor, { backgroundColor: colors.transfer }]} />
          </View>

          <Text style={[styles.inWordsText, { color: colors.textTertiary }]}>
            {numberToWords(parsedAmount)}
          </Text>

          {/* Quick Shortcuts */}
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              onPress={() => handleAddQuickAmount(500)}
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
                +₹500
              </Text>
            </TouchableOpacity>

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
              onPress={() => handleAddQuickAmount(2000)}
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
                +₹2,000
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
          </View>
        </View>

        {/* 4. Directional Accounts: FROM Account */}
        <AccountSelectorCard
          accounts={accounts}
          selectedId={fromAccountId}
          label="TRANSFER FROM"
          onSelect={(a) => setFromAccountId(a.id)}
        />

        {/* Down Arrow Indicator */}
        <View style={styles.directionIndicator}>
          <View
            style={[
              styles.directionCircle,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <ArrowDown size={18} color={colors.transfer} strokeWidth={2.4} />
          </View>
        </View>

        {/* 5. Directional Accounts: TO Account */}
        <AccountSelectorCard
          accounts={accounts}
          selectedId={toAccountId}
          label="TRANSFER TO"
          onSelect={(a) => setToAccountId(a.id)}
        />

        {/* 6. Date & Time */}
        <DateTimeCards
          date={date}
          onChangeDate={setDate}
        />

        {/* 7. Note Card */}
        <NoteCard
          value={note}
          placeholder="e.g., ATM withdrawal, bank transfer"
          onChangeText={setNote}
        />

        {/* 8. Keypad */}
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
              backgroundColor: isValid ? colors.transfer : colors.surfaceElevated,
            },
            shadows.md,
          ]}
        >
          <View style={styles.saveLeft}>
            <ArrowLeftRight size={20} color={isValid ? '#FFFFFF' : colors.textTertiary} strokeWidth={2.4} />
            <Text
              style={[
                styles.saveTitle,
                { color: isValid ? '#FFFFFF' : colors.textTertiary },
              ]}
            >
              Complete Transfer
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  quickEntryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  quickEntryText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.5,
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
  directionIndicator: {
    alignItems: 'center',
    marginVertical: -spacing.xs,
  },
  directionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
