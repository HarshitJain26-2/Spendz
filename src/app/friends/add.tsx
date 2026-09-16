import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useFriendStore } from '@/store/friendStore';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function AddFriendScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const addFriend = useFriendStore((s) => s.addFriend);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;

    addFriend({
      name: name.trim(),
      phone: phone.trim() || undefined,
    });

    router.back();
  };

  const isValid = Boolean(name.trim());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Add Friend
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.accent + '20' },
              ]}
            >
              <UserPlus size={36} color={colors.accent} />
            </View>
          </View>

          <Input
            label="Friend's Name"
            placeholder="e.g., Alex, Sarah"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Input
            label="Phone or UPI ID (optional)"
            placeholder="e.g., +91 98765 43210 or user@upi"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.bottom}>
          <Button
            title="Add Friend"
            onPress={handleSubmit}
            size="lg"
            fullWidth
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  iconWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
});
