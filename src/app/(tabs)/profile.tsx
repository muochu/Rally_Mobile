import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarPermissionsPanel } from '@/components/feature/calendar-permissions-panel';
import { useAuth } from '@/hooks/use-auth';
import type { PreferredHours } from '@/hooks/use-profile';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const initials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

type HourKey = keyof PreferredHours;

const HOUR_OPTIONS: { key: HourKey; label: string; sub: string }[] = [
  { key: 'weekday_morning', label: 'Weekday mornings', sub: '7am – noon' },
  { key: 'weekday_evening', label: 'Weekday evenings', sub: '5pm – 9pm' },
  { key: 'weekend', label: 'Weekends', sub: 'Sat & Sun all day' },
];

export default function ProfileScreen(): ReactElement {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();

  const { profile, isLoading } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUtr, setEditUtr] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = useCallback((): void => {
    setEditName(profile?.full_name ?? '');
    setEditUtr(profile?.utr_rating?.toString() ?? '');
    setEditCity(profile?.city ?? '');
    setEditOpen(true);
  }, [profile]);

  const handleSaveEdit = useCallback(async (): Promise<void> => {
    setSaving(true);
    try {
      const utr = parseFloat(editUtr);
      await updateProfile({
        full_name: editName.trim() || undefined,
        utr_rating: isNaN(utr) ? null : Math.min(16.5, Math.max(0, utr)),
        city: editCity.trim() || undefined,
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }, [editName, editUtr, editCity, updateProfile]);

  const handleToggleHours = useCallback(
    async (key: HourKey): Promise<void> => {
      if (!profile) return;
      haptics.light();
      const current: PreferredHours = profile.preferred_hours ?? {
        weekday_morning: false,
        weekday_evening: false,
        weekend: false,
      };
      await updateProfile({
        preferred_hours: { ...current, [key]: !current[key] },
      });
    },
    [profile, updateProfile],
  );

  const handleSignOut = useCallback((): void => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async (): Promise<void> => {
          await supabase.auth.signOut();
          queryClient.clear();
          router.replace('/' as Parameters<typeof router.replace>[0]);
        },
      },
    ]);
  }, [queryClient, router]);

  const handleDeleteAccount = useCallback((): void => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account, all matches, and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: (): void => {
            Alert.alert(
              'Not yet available',
              'Account deletion requires contacting support at support@rally.app.',
            );
          },
        },
      ],
    );
  }, []);

  const preferred: PreferredHours = profile?.preferred_hours ?? {
    weekday_morning: false,
    weekday_evening: false,
    weekend: false,
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile.full_name)}</Text>
          </View>
          <Text style={styles.name}>{profile.full_name}</Text>
          {profile.utr_rating != null && (
            <View style={styles.utrBadge}>
              <Text style={styles.utrText}>
                UTR {profile.utr_rating.toFixed(1)}
              </Text>
            </View>
          )}
          {profile.city != null && (
            <Text style={styles.city}>{profile.city}</Text>
          )}
          <Pressable style={styles.editBtn} onPress={openEdit}>
            <Text style={styles.editBtnText}>Edit profile</Text>
          </Pressable>
        </View>

        {/* When I play */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When I play</Text>
          <Text style={styles.sectionSub}>
            Only show me match slots during these times
          </Text>
          <View style={styles.hoursGrid}>
            {HOUR_OPTIONS.map(({ key, label, sub }) => {
              const active = preferred[key];
              return (
                <Pressable
                  key={key}
                  style={[styles.hourChip, active && styles.hourChipActive]}
                  onPress={() => handleToggleHours(key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                >
                  <Text
                    style={[styles.hourLabel, active && styles.hourLabelActive]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[styles.hourSub, active && styles.hourSubActive]}
                  >
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <CalendarPermissionsPanel
            userId={userId}
            onSynced={() =>
              queryClient.invalidateQueries({
                queryKey: ['availability-blocks'],
              })
            }
          />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.rowGroup}>
            <Pressable style={styles.row} onPress={handleSignOut}>
              <Text style={styles.rowLabel}>Sign out</Text>
              <ChevronRight
                size={16}
                color={colors.text.tertiary}
                strokeWidth={1.75}
              />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable style={styles.row} onPress={handleDeleteAccount}>
              <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>
                Delete account
              </Text>
              <ChevronRight
                size={16}
                color={colors.status.error}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.rowGroup}>
            <Pressable
              style={styles.row}
              onPress={() => void Linking.openURL('https://rally.app/privacy')}
            >
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <ChevronRight
                size={16}
                color={colors.text.tertiary}
                strokeWidth={1.75}
              />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.row}
              onPress={() => void Linking.openURL('https://rally.app/terms')}
            >
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <ChevronRight
                size={16}
                color={colors.text.tertiary}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.version}>Rally v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEditOpen(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit profile</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            placeholderTextColor={colors.text.tertiary}
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>UTR Rating</Text>
          <TextInput
            style={styles.fieldInput}
            value={editUtr}
            onChangeText={setEditUtr}
            placeholder="e.g. 5.5"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>City</Text>
          <TextInput
            style={styles.fieldInput}
            value={editCity}
            onChangeText={setEditCity}
            placeholder="e.g. Vancouver"
            placeholderTextColor={colors.text.tertiary}
            autoCorrect={false}
          />

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveEdit}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingState: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.accent.primary,
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
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: -spacing.sm,
  },
  hoursGrid: {
    gap: spacing.sm,
  },
  hourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.elevated,
  },
  hourChipActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  hourLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  hourLabelActive: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  hourSub: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  hourSubActive: {
    color: colors.accent.secondary,
  },
  rowGroup: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginLeft: spacing.lg,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  rowLabelDestructive: {
    color: colors.status.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xl,
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.secondary,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  fieldInput: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.lg,
  },
  saveBtn: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
