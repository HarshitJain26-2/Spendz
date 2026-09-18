import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';

interface DateTimeCardsProps {
  date: string; // ISO date string YYYY-MM-DD
  time?: string; // e.g. "08:42 PM"
  onChangeDate?: (date: string) => void;
  style?: ViewStyle;
}

export const DateTimeCards: React.FC<DateTimeCardsProps> = ({
  date,
  time,
  onChangeDate,
  style,
}) => {
  const { colors } = useTheme();

  // Format date display: "Today, Sep 15" or "Yesterday, Sep 14" or "Sep 15"
  const getFormattedDate = () => {
    try {
      const target = new Date(date);
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

      const monthName = target.toLocaleDateString('en-US', { month: 'short' });
      const day = target.getDate();

      if (isToday) return `Today, ${monthName} ${day}`;
      if (isYesterday) return `Yesterday, ${monthName} ${day}`;
      return `${monthName} ${day}`;
    } catch {
      return 'Today';
    }
  };

  // Format time display
  const getFormattedTime = () => {
    if (time) return time;
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Date Card */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          // Toggle Today / Yesterday on quick tap if simple
          if (onChangeDate) {
            const todayISO = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayISO = yesterday.toISOString().split('T')[0];
            onChangeDate(date === todayISO ? yesterdayISO : todayISO);
          }
        }}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Calendar size={18} color={colors.textSecondary} strokeWidth={2} />
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
      </TouchableOpacity>

      {/* Time Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Clock size={18} color={colors.textSecondary} strokeWidth={2} />
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
