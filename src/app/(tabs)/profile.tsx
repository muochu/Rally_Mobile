import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { useAuth } from '@/hooks/use-auth';
import type { PreferredHours } from '@/hooks/use-profile';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type HourKey = keyof PreferredHours;

export default function ProfileScreen(): ReactElement {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();

  const { profile, isLoading } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);

  const [editOpen, setEditOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

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

  const handleAvatarPress = useCallback(async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      await Linking.openSettings();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      await updateProfile({ avatar_url: urlData.publicUrl });
    } catch {
      Alert.alert('Upload failed', 'Could not update your photo. Try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [userId, updateProfile]);

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
              'Are you sure?',
              'Final confirmation — this action is irreversible.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async (): Promise<void> => {
                    const {
                      data: { session },
                    } = await supabase.auth.getSession();
                    if (!session) return;
                    const { error } = await supabase.functions.invoke(
                      'delete-account',
                      {
                        headers: {
                          Authorization: `Bearer ${session.access_token}`,
                        },
                      },
                    );
                    if (error) {
                      Alert.alert(
                        'Error',
                        'Could not delete account. Please try again.',
                      );
                      return;
                    }
                    await supabase.auth.signOut();
                    queryClient.clear();
                    router.replace('/' as Parameters<typeof router.replace>[0]);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [queryClient, router]);

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState} />
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

        <Text style={styles.version}>Rally v1.0.0</Text>
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
