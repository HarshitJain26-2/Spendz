import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  BackHandler,
  Keyboard,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { ArrowLeft, RotateCcw, Zap } from 'lucide-react-native';
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

type InputMode =
  | 'none'
  | 'amount'
  | 'note'
  | 'account'
  | 'category'
  | 'date'
  | 'time';

export default function AddExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userProfile = useAppStore((s) => s.userProfile);

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const categories = useCategoryStore((s) => s.categories);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const accounts = useAccountStore((s) => s.accounts);

  const [inputMode, setInputMode] = useState<InputMode>('none');
  const noteInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [noteLayout, setNoteLayout] = useState({ y: 0, height: 0 });
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [amount, setAmount] = useState('500');
  const [categoryId, setCategoryId] = useState<string | null>(
    expenseCategories[0]?.id || null
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('');

  // Dynamically calculate scroll position so NoteCard sits comfortably above the keyboard/CTA
  const scrollToNote = useCallback(() => {
    if (!scrollViewRef.current || noteLayout.y <= 0) return;
    const gap = 24;
    const visibleH = scrollViewHeight > 0 ? scrollViewHeight : 350;
    const targetY = Math.max(0, noteLayout.y + noteLayout.height + gap - visibleH);
    scrollViewRef.current.scrollTo({ y: targetY, animated: true });
  }, [noteLayout.y, noteLayout.height, scrollViewHeight]);

  // Strict single-input-mode activator: blurs note and dismisses native keyboard when switching away from 'note'
  const activateInputMode = useCallback((mode: InputMode) => {
    if (mode !== 'note') {
      noteInputRef.current?.blur();
      Keyboard.dismiss();
    }
    setInputMode(mode);
  }, []);

  // Listen to native keyboard appearance and dismissal
  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setInputMode((current) => (current === 'note' ? 'none' : current));
      setKeyboardHeight(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => {
        scrollToNote();
      });
    });

    return () => {
      hideSubscription.remove();
      showSubscription.remove();
    };
  }, [scrollToNote]);

  // Ensure NoteCard is scrolled into comfortable view when Note mode is activated or layout updates
  useEffect(() => {
    if (inputMode === 'note' && noteLayout.y > 0 && scrollViewHeight > 0) {
      const timer = setTimeout(() => {
        scrollToNote();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [inputMode, noteLayout.y, scrollViewHeight, scrollToNote]);

  // Android hardware back press handler: dismiss active input mode first, else navigate back
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inputMode !== 'none') {
        activateInputMode('none');
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [inputMode, activateInputMode]);

  const isAmountFocused = inputMode === 'amount';

  // Keypad actions
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
    const rounded = Math.ceil(current / 10) * 10;
    setAmount((rounded === current ? rounded + 10 : rounded).toString());
  };

  const handleResetDraft = () => {
    activateInputMode('none');
    setAmount('');
    setNote('');
    if (expenseCategories[0]) setCategoryId(expenseCategories[0].id);
    if (accounts[0]) setAccountId(accounts[0].id);
    setDate(getTodayISO());
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0 && Boolean(accountId);

  const handleSubmit = () => {
    activateInputMode('none');
    if (!isValid) return;

    addTransaction({
      type: 'expense',
      amount: parsedAmount,
      categoryId,
      accountId,
      note: note.trim() || 'Expense',
      date,
    });

    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* 1. Header Row */}
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
              New Transaction
            </Text>
          </View>

          <Avatar name={userProfile.name || 'You'} size={36} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            inputMode === 'note' && {
              paddingBottom: Math.max(keyboardHeight > 0 ? 120 : 60, spacing['3xl']),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            activateInputMode('none');
          }}
          onLayout={(e) => {
            setScrollViewHeight(e.nativeEvent.layout.height);
          }}
        >
          {/* 2. Sub-Header (Quick Entry + Reset Draft) */}
          <View style={styles.subHeader}>
            <View
              style={[
                styles.quickEntryPill,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text
                style={[styles.quickEntryText, { color: colors.textSecondary }]}
              >
                QUICK ENTRY
              </Text>
              <View style={[styles.mintDot, { backgroundColor: colors.accent }]} />
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
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              activateInputMode('amount');
            }}
            style={[
              styles.amountCard,
              {
                backgroundColor: colors.surface,
                borderColor: isAmountFocused ? colors.accent : colors.border,
              },
              shadows.sm,
            ]}
          >
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              Enter Amount Spent
            </Text>

            {/* Amount with blinking cursor */}
            <View style={styles.amountDisplayRow}>
              <Text style={[styles.amountCurrency, { color: colors.textPrimary }]}>
                ₹
              </Text>
              <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
                {amount || '0'}
              </Text>
              {isAmountFocused && (
                <View style={[styles.cursor, { backgroundColor: colors.accent }]} />
              )}
            </View>

            {/* Number in words */}
            <Text style={[styles.inWordsText, { color: colors.textTertiary }]}>
              {numberToWords(parsedAmount)}
            </Text>

            {/* Amount Shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                onPress={() => {
                  activateInputMode('amount');
                  handleAddQuickAmount(100);
                }}
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
                  +₹100
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  activateInputMode('amount');
                  handleAddQuickAmount(500);
                }}
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
                onPress={() => {
                  activateInputMode('amount');
                  handleAddQuickAmount(1000);
                }}
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
                onPress={() => {
                  activateInputMode('amount');
                  handleRoundOff();
                }}
                activeOpacity={0.7}
                style={[
                  styles.roundOffChip,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Text style={[styles.roundOffText, { color: colors.accent }]}>
                  Round off
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* 4. Category Selector Card */}
          <CategorySelectorCard
            categories={expenseCategories}
            selectedId={categoryId}
            isOpen={inputMode === 'category'}
            onOpenChange={(open) => {
              activateInputMode(open ? 'category' : 'none');
            }}
            onSelect={(c) => {
              setCategoryId(c.id);
              activateInputMode('none');
            }}
            onOpen={() => {
              activateInputMode('category');
            }}
          />

          {/* 5. Paid From Account Selector Card */}
          <AccountSelectorCard
            accounts={accounts}
            selectedId={accountId}
            isOpen={inputMode === 'account'}
            onOpenChange={(open) => {
              activateInputMode(open ? 'account' : 'none');
            }}
            onSelect={(a) => {
              setAccountId(a.id);
              activateInputMode('none');
            }}
            onOpen={() => {
              activateInputMode('account');
            }}
          />

          {/* 6. Date & Time Cards */}
          <DateTimeCards
            date={date}
            onChangeDate={setDate}
            onDatePress={() => {
              activateInputMode('date');
            }}
            onTimePress={() => {
              activateInputMode('time');
            }}
          />

          {/* 7. Note Card */}
          <NoteCard
            value={note}
            onChangeText={setNote}
            inputRef={noteInputRef}
            onFocus={() => {
              activateInputMode('note');
              setTimeout(() => {
                scrollToNote();
              }, 80);
            }}
            onBlur={() => {
              if (inputMode === 'note') {
                activateInputMode('none');
              }
            }}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setNoteLayout({ y, height });
            }}
          />

          {/* 8. Tactile Numeric Keypad */}
          {isAmountFocused && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOutDown.duration(150)}
            >
              <NumericKeypad
                onKeyPress={handleKeyPress}
                onDelete={handleDelete}
                style={styles.keypad}
              />
            </Animated.View>
          )}
        </ScrollView>

        {/* 9. Bottom Save CTA Action */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              paddingBottom:
                inputMode === 'note'
                  ? 10
                  : Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8),
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
                backgroundColor: isValid ? colors.accent : colors.surfaceElevated,
              },
              shadows.md,
            ]}
          >
            <View style={styles.saveLeft}>
              <Zap size={20} color={isValid ? '#000000' : colors.textTertiary} strokeWidth={2.4} />
              <Text
                style={[
                  styles.saveTitle,
                  { color: isValid ? '#000000' : colors.textTertiary },
                ]}
              >
                Save Instant Expense
              </Text>
            </View>

            <View
              style={[
                styles.saveDivider,
                { backgroundColor: isValid ? 'rgba(0,0,0,0.15)' : colors.border },
              ]}
            />

            <Text
              style={[
                styles.saveTotal,
                { color: isValid ? '#000000' : colors.textTertiary },
              ]}
            >
              TOTAL {formatCurrency(parsedAmount)}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
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
