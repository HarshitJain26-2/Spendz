import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

export interface DateTimePickerFieldProps {
  mode: 'date' | 'time';
  /** Full current datetime of the transaction being edited. */
  value: Date;
  /** Called with a Date carrying the newly picked date (or time) fields. */
  onCommit: (picked: Date) => void;
  /** Called when the picker is dismissed without committing. */
  onClose: () => void;
}

/**
 * Native date/time picker.
 * - Android/Windows: uses the OS dialog, which auto-dismisses after a choice.
 * - iOS: renders the spinner inside a themed bottom sheet with Cancel/Done.
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
  const [pending, setPending] = useState<Date>(value);

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onValueChange={(_event: DateTimePickerChangeEvent, picked: Date) => {
          if (picked) {
            onCommit(picked);
          }
          onClose();
        }}
        onDismiss={onClose}
      />
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[styles.handle, { backgroundColor: colors.border }]}
          />
          <DateTimePicker
            value={pending}
            mode={mode}
            display="spinner"
            themeVariant={colors.background === '#0D0D0E' ? 'dark' : 'light'}
            onValueChange={(_event: DateTimePickerChangeEvent, picked: Date) => {
              if (picked) setPending(picked);
            }}
          />
          <View
            style={[styles.actions, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.actionBtn}
            >
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onCommit(pending);
                onClose();
              }}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
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
