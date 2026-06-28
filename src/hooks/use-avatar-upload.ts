import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { reportError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

type UpdateProfile = (updates: { avatar_url: string }) => Promise<void>;

export const useAvatarUpload = (
  userId: string,
  updateProfile: UpdateProfile,
): { uploadingAvatar: boolean; handleAvatarPress: () => Promise<void> } => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const path = `${userId}/avatar.${ext}`;

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, byteArray, { contentType: mimeType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      await updateProfile({
        avatar_url: `${urlData.publicUrl}?t=${Date.now()}`,
      });
    } catch (err) {
      reportError(err, { context: 'avatarUpload' });
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Upload failed', message);
    } finally {
      setUploadingAvatar(false);
    }
  }, [userId, updateProfile]);

  return { uploadingAvatar, handleAvatarPress };
};
