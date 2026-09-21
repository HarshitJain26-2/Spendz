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
import { ArrowLeft, RotateCcw, Zap } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { CategorySelectorCard } from '@/components/transaction/CategorySelectorCard';
import { AccountSelectorCard } from '@/components/transaction/AccountSelectorCard';
import { DateTimeCards } from '@/components/transaction/DateTimeCards';
import { NoteCard } from '@/components/transaction/NoteCard';
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
  const inputModeRef = useRef<InputMode>('none');
  inputModeRef.current = inputMode;

  const amountInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [noteLayout, setNoteLayout] = useState({ y: 0, height: 0 });
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [amount, setAmount] = useState('0');
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

  // Strict single-input-mode activator: blurs inputs not matching active mode
  const activateInputMode = useCallback((mode: InputMode) => {
    if (mode !== 'note') {
      noteInputRef.current?.blur();
    }
    if (mode !== 'amount') {
      amountInputRef.current?.blur();
    }
    if (mode !== 'note' && mode !== 'amount') {
      Keyboard.dismiss();
    }
    setInputMode(mode);
  }, []);

  // Listen to native keyboard appearance and dismissal
  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (inputModeRef.current === 'note') {
        requestAnimationFrame(() => {
          scrollToNote();
        });
      } else if (inputModeRef.current === 'amount') {
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
      }
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

  const handleAmountChange = (text: string) => {
    if (text === '') {
      setAmount('');
      return;
    }

    // Replace comma with dot
    let cleaned = text.replace(/,/g, '.');
    // Keep only numbers and dot
    cleaned = cleaned.replace(/[^0-9.]/g, '');

    // Allow at most one dot
    const firstDotIndex = cleaned.indexOf('.');
    if (firstDotIndex !== -1) {
      cleaned =
        cleaned.slice(0, firstDotIndex + 1) +
        cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
    }

    // Strip leading zeros unless followed by a dot (e.g. "05" -> "5", but "0." remains "0.")
    if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }

    if (cleaned === '.') {
      cleaned = '0.';
    }

    // Split and limit
    const parts = cleaned.split('.');
    if (parts[0].length > 8) {
      parts[0] = parts[0].slice(0, 8);
    }
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].slice(0, 2);
    }

    cleaned = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
    setAmount(cleaned);
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
    setAmount('0');
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
              amountInputRef.current?.focus();
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

            {/* Amount with native TextInput */}
            <View style={styles.amountDisplayRow}>
              <Text style={[styles.amountCurrency, { color: colors.textPrimary }]}>
                ₹
              </Text>
              <TextInput
                ref={amountInputRef}
                value={amount}
                onChangeText={handleAmountChange}
                onFocus={() => {
                  activateInputMode('amount');
                }}
                onBlur={() => {
                  if (amount === '' || amount === '.') {
                    setAmount('0');
                  }
                }}
                keyboardType="decimal-pad"
                returnKeyType="done"
                cursorColor={colors.accent}
                selectionColor={colors.accent}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.amountInput,
                  { color: colors.textPrimary },
                  Platform.OS === 'web' && ({ width: `${Math.max(1, (amount || '0').length + 0.5)}ch` } as any),
                ]}
              />
            </View>

            {/* Number in words */}
            <Text style={[styles.inWordsText, { color: colors.textTertiary }]}>
              {numberToWords(parsedAmount)}
            </Text>

            {/* Amount Shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                onPress={() => {
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
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setNoteLayout({ y, height });
            }}
          />
        </ScrollView>

        {/* 8. Bottom Save CTA Action */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              paddingBottom:
                inputMode === 'note' || inputMode === 'amount'
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
  amountInput: {
    fontSize: 40,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: -1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    minWidth: 40,
    textAlign: 'left',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
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

