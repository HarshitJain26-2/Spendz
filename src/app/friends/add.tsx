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
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useFriendStore } from '@/store/friendStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

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
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Add Friend
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          <Card style={styles.formCard} padding="lg">
            <View style={styles.iconCenter}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <UserPlus size={28} color={colors.accent} />
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
          </Card>
        </View>

        <View style={[styles.bottom, { backgroundColor: colors.background }]}>
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  formCard: {
    gap: spacing.md,
  },
  iconCenter: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
});
