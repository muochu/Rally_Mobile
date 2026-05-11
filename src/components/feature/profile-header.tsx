import { Camera } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  name: string;
  avatarUrl: string | null | undefined;
  utrRating: number | null | undefined;
  city: string | null | undefined;
  uploadingAvatar: boolean;
  onAvatarPress: () => void;
  onEditPress: () => void;
};

export function ProfileHeader({
  name,
  avatarUrl,
  utrRating,
  city,
  uploadingAvatar,
  onAvatarPress,
  onEditPress,
}: Props): ReactElement {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.avatarWrap}
        onPress={onAvatarPress}
        accessibilityLabel="Change profile photo"
        accessibilityRole="button"
      >
        <Avatar name={name} imageUrl={avatarUrl} size={80} />
        <View style={styles.avatarBadge}>
          {uploadingAvatar ? null : (
            <Camera size={12} color="#fff" strokeWidth={2} />
          )}
        </View>
      </Pressable>
      <Text style={styles.name}>{name}</Text>
      {utrRating != null && (
        <View style={styles.utrBadge}>
          <Text style={styles.utrText}>UTR {utrRating.toFixed(1)}</Text>
        </View>
      )}
      {city != null && <Text style={styles.city}>{city}</Text>}
      <Pressable style={styles.editBtn} onPress={onEditPress}>
        <Text style={styles.editBtnText}>Edit profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: spacing.sm,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
    borderWidth: 2,
    borderColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  utrBadge: {
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.accent.soft,
  },
  utrText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  city: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  editBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
});
