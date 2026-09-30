import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';
import type { DateTimePickerFieldProps } from './DateTimePickerField';

const pad = (n: number) => String(n).padStart(2, '0');

const toInputValue = (mode: 'date' | 'time', value: Date): string => {
  if (mode === 'date') {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
      value.getDate()
    )}`;
  }
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

/**
 * Web date/time picker.
 * `@react-native-community/datetimepicker` renders nothing on web, so we use the
 * browser's native `<input type="date|time">` (the platform-native picker on web)
 * inside a themed sheet that mirrors the native experience.
 *
 * The parent combines the returned Date with the existing datetime so that
 * changing the date preserves the time (and vice-versa).
 */
export const DateTimePickerField: React.FC<DateTimePickerFieldProps> = ({
  mode,
  value,
  onCommit,
  onClose,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string>(() => toInputValue(mode, value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Attempt to open the browser picker immediately; if the gesture window has
  // passed the user can simply tap the (visible) input to open it.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    try {
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      /* showPicker may reject outside a direct user gesture — safe to ignore */
    }
  }, []);

  const commit = () => {
    if (mode === 'date') {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(draft);
      if (match) {
        const [, y, m, d] = match;
        onCommit(new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0));
      }
    } else {
      const match = /^(\d{2}):(\d{2})/.exec(draft);
      if (match) {
        const [, hh, mm] = match;
        onCommit(new Date(2000, 0, 1, Number(hh), Number(mm), 0, 0));
      }
    }
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {mode === 'date' ? 'Select Date' : 'Select Time'}
          </Text>

          <input
            ref={inputRef}
            type={mode}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') onClose();
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 14,
              fontSize: 18,
              fontFamily: typography.fontFamily.semiBold,
              color: colors.textPrimary,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.lg,
              outline: 'none',
            }}
          />

          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.actionBtn}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={commit}
              activeOpacity={0.7}
              style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: 17,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.semiBold,
  },
  doneText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.bold,
    color: '#06251C',
  },
});
