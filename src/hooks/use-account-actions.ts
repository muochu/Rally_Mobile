import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

type AccountActions = {
  handleSignOut: () => void;
  handleDeleteAccount: () => void;
};

export const useAccountActions = (): AccountActions => {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  return { handleSignOut, handleDeleteAccount };
};
