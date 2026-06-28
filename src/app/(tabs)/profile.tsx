import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarPermissionsPanel } from '@/components/feature/calendar-permissions-panel';
import { PreferredHoursSection } from '@/components/feature/preferred-hours-section';
import { ProfileEditModal } from '@/components/feature/profile-edit-modal';
import { ProfileHeader } from '@/components/feature/profile-header';
import { ProfileSettingsSection } from '@/components/feature/profile-settings-section';
import { useAccountActions } from '@/hooks/use-account-actions';
import { useAuth } from '@/hooks/use-auth';
import { useAvatarUpload } from '@/hooks/use-avatar-upload';
import type { PreferredHours } from '@/hooks/use-profile';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type HourKey = keyof PreferredHours;

export default function ProfileScreen(): ReactElement {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();

  const { profile, isLoading } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);

  const [editOpen, setEditOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  const { uploadingAvatar, handleAvatarPress } = useAvatarUpload(
    userId,
    updateProfile,
  );
  const { handleSignOut, handleDeleteAccount } = useAccountActions();

  useEffect((): void => {
    void Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === 'granted');
    });
  }, []);

  const handleNotifToggle = useCallback(async (): Promise<void> => {
    if (notifGranted) {
      await Linking.openSettings();
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifGranted(status === 'granted');
      if (status !== 'granted') await Linking.openSettings();
    }
  }, [notifGranted]);

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

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const preferred: PreferredHours = profile.preferred_hours ?? {
    weekday_morning: false,
    weekday_evening: false,
    weekend: false,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={profile.full_name}
          avatarUrl={profile.avatar_url}
          utrRating={profile.utr_rating}
          city={profile.city}
          uploadingAvatar={uploadingAvatar}
          onAvatarPress={(): void => {
            void handleAvatarPress();
          }}
          onEditPress={(): void => setEditOpen(true)}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When I play</Text>
          <Text style={styles.sectionSub}>
            Only show me match slots during these times
          </Text>
          <PreferredHoursSection
            preferred={preferred}
            onToggle={(key): void => {
              void handleToggleHours(key);
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <CalendarPermissionsPanel
            userId={userId}
            onSynced={(): void => {
              void queryClient.invalidateQueries({
                queryKey: ['availability-blocks'],
              });
            }}
          />
        </View>

        <ProfileSettingsSection
          notifGranted={notifGranted}
          onNotifToggle={(): void => {
            void handleNotifToggle();
          }}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
        />

        <Text style={styles.version}>
          Rally v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>

      <ProfileEditModal
        visible={editOpen}
        initialName={profile.full_name}
        initialUtr={profile.utr_rating?.toString() ?? ''}
        initialCity={profile.city ?? ''}
        onSave={async (updates): Promise<void> => {
          await updateProfile(updates);
          setEditOpen(false);
        }}
        onClose={(): void => setEditOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
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
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
});

export { TabErrorFallback as ErrorBoundary } from '@/components/ui/tab-error-fallback';
