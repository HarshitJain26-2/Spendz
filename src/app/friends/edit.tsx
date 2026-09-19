import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useFriendStore } from '@/store/friendStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F472B6',
  '#60A5FA', '#34D399', '#FB923C', '#E879F9', '#38BDF8',
];

export default function EditFriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const friends = useFriendStore((s) => s.friends);
  const friend = friends.find((f) => f.id === id);
  const updateFriend = useFriendStore((s) => s.updateFriend);

  const [name, setName] = useState(friend?.name ?? '');
  const [phone, setPhone] = useState(friend?.phone ?? '');
  const [avatarColor, setAvatarColor] = useState(
    friend?.avatarColor ?? AVATAR_COLORS[0]
  );

  useEffect(() => {
    if (friend) {
      setName(friend.name);
      setPhone(friend.phone ?? '');
      setAvatarColor(friend.avatarColor || AVATAR_COLORS[0]);
    }
  }, [friend]);

  if (!friend) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Edit Friend
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.textSecondary }}>Friend not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const trimmedName = name.trim();
  const isValid = Boolean(trimmedName);

  const handleSave = () => {
    if (!isValid) return;

    updateFriend(friend.id, {
      name: trimmedName,
      phone: phone.trim() || null,
      avatarColor,
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
            Edit Friend
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Preview & Color Selection Card */}
          <Card style={styles.avatarCard} padding="lg">
            <View style={styles.avatarPreviewWrap}>
              <Avatar
                name={trimmedName || friend.name || 'Friend'}
                size={72}
                color={avatarColor}
              />
              <Text
                style={[styles.avatarHint, { color: colors.textSecondary }]}
              >
                Avatar Preview
              </Text>
            </View>

            <View style={styles.colorPaletteHeader}>
              <Text
                style={[
                  styles.colorPaletteTitle,
                  { color: colors.textSecondary },
                ]}
              >
                CHOOSE AVATAR COLOR
              </Text>
            </View>

            <View style={styles.colorSwatches}>
              {AVATAR_COLORS.map((c) => {
                const isSelected = avatarColor.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setAvatarColor(c)}
                    activeOpacity={0.8}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      isSelected && styles.swatchSelected,
                    ]}
                  >
                    {isSelected && (
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Form Card */}
          <Card style={styles.formCard} padding="lg">
            <Input
              label="Name"
              placeholder="e.g., Rahul Sharma"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Input
              label="Contact"
              placeholder="e.g., +91 98765 43210 or user@upi"
              value={phone}
              onChangeText={setPhone}
            />
          </Card>
        </ScrollView>

        {/* Bottom CTA respecting safe-area */}
        <View
          style={[
            styles.bottom,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs,
            },
          ]}
        >
          <Button
            title="Save Changes"
            onPress={handleSave}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  avatarCard: {
    alignItems: 'center',
  },
  avatarPreviewWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  avatarHint: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    marginTop: spacing.xs,
  },
  colorPaletteHeader: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  colorPaletteTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  colorSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: spacing.xs,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
    ...shadows.sm,
  },
  formCard: {
    gap: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
