import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Calendar, Clock, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { parseDateLocal, formatTimeLabel } from '@/utils/date';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

export type DateShortcutType = 'today' | 'yesterday' | 'now';

interface DateTimeCardsProps {
  date: string; // ISO date string YYYY-MM-DD or full ISO datetime
  time?: string; // e.g. "08:42 PM"
  onChangeDate?: (date: string) => void;
  onDatePress?: () => void;
  onTimePress?: () => void;
  /** When false, tapping DATE only fires onDatePress (no Today/Yesterday toggle) */
  quickDateToggle?: boolean;
  showShortcuts?: boolean;
  onSelectShortcut?: (type: DateShortcutType) => void;
  style?: ViewStyle;
}

export const DateTimeCards: React.FC<DateTimeCardsProps> = ({
  date,
  time,
  onChangeDate,
  onDatePress,
  onTimePress,
  quickDateToggle = true,
  showShortcuts = false,
  onSelectShortcut,
  style,
}) => {
  const { colors } = useTheme();

  const target = React.useMemo(() => parseDateLocal(date), [date]);
  const today = new Date();
  const isToday =
    target.getDate() === today.getDate() &&
    target.getMonth() === today.getMonth() &&
    target.getFullYear() === today.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    target.getDate() === yesterday.getDate() &&
    target.getMonth() === yesterday.getMonth() &&
    target.getFullYear() === yesterday.getFullYear();

  // Format date display: "Today, Sep 15" or "Yesterday, Sep 14" or "Sep 15" (adds year when different)
  const getFormattedDate = () => {
    try {
      const monthName = target.toLocaleDateString('en-US', { month: 'short' });
      const day = target.getDate();
      const yearSuffix =
        target.getFullYear() !== today.getFullYear()
          ? ` ${target.getFullYear()}`
          : '';

      if (isToday) return `Today, ${monthName} ${day}`;
      if (isYesterday) return `Yesterday, ${monthName} ${day}`;
      return `${monthName} ${day}${yearSuffix}`;
    } catch {
      return 'Today';
    }
  };

  // Format time display: uses passed time or accurately formats the date's local time
  const getFormattedTime = () => {
    if (time) return time;
    try {
      return formatTimeLabel(target);
    } catch {
      return formatTimeLabel(new Date());
    }
  };

  const handleDatePress = () => {
    if (onDatePress) {
      onDatePress();
    } else if (onChangeDate && quickDateToggle) {
      const todayISO = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayISO = yesterdayDate.toISOString().split('T')[0];
      const currentDateOnly = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
      onChangeDate(currentDateOnly === todayISO ? yesterdayISO : todayISO);
    }
  };

  const hasShortcuts = Boolean(showShortcuts || onSelectShortcut);

  return (
    <View style={[styles.wrapper, style]}>
      {/* Quick Date/Time Shortcuts */}
      {hasShortcuts && (
        <View style={styles.shortcutsContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelectShortcut?.('today')}
            style={[
              styles.shortcutPill,
              {
                backgroundColor: isToday ? colors.accentLight : colors.surfaceElevated,
                borderColor: isToday ? colors.accent : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isToday ? colors.accent : colors.textTertiary },
              ]}
            />
            <Text
              style={[
                styles.shortcutText,
                {
                  color: isToday ? colors.accent : colors.textSecondary,
                  fontWeight: isToday ? '700' : '500',
                },
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelectShortcut?.('yesterday')}
            style={[
              styles.shortcutPill,
              {
                backgroundColor: isYesterday ? colors.accentLight : colors.surfaceElevated,
                borderColor: isYesterday ? colors.accent : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isYesterday ? colors.accent : colors.textTertiary },
              ]}
            />
            <Text
              style={[
                styles.shortcutText,
                {
                  color: isYesterday ? colors.accent : colors.textSecondary,
                  fontWeight: isYesterday ? '700' : '500',
                },
              ]}
            >
              Yesterday
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelectShortcut?.('now')}
            style={[
              styles.shortcutPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Clock size={11} color={colors.textSecondary} />
            <Text
              style={[
                styles.shortcutText,
                { color: colors.textSecondary },
              ]}
            >
              Set Current Time
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date & Time Row Cards */}
      <View style={styles.container}>
        {/* Date Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDatePress}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Calendar size={18} color={colors.accent} strokeWidth={2} />
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              DATE
            </Text>
            <Text
              style={[styles.value, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {getFormattedDate()}
            </Text>
          </View>
          <ChevronDown size={14} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Time Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTimePress?.()}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Clock size={18} color={colors.accent} strokeWidth={2} />
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              TIME
            </Text>
            <Text
              style={[styles.value, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {getFormattedTime()}
            </Text>
          </View>
          <ChevronDown size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  shortcutsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: 4,
  },
  shortcutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shortcutText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.sm,
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
    fontSize: 14,
    fontFamily: typography.fontFamily.semiBold,
  },
});

