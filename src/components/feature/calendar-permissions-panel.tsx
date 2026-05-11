import * as Calendar from 'expo-calendar';
import { CheckCircle, Circle, RefreshCw } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { syncAvailability } from '@/hooks/use-availability-sync';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
} from '@/lib/calendar/google';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  userId: string;
  onSynced: () => void;
};

export function CalendarPermissionsPanel({
  userId,
  onSynced,
}: Props): ReactElement {
  const [appleGranted, setAppleGranted] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  useEffect(() => {
    void Calendar.getCalendarPermissionsAsync().then(({ status }) => {
      setAppleGranted(status === 'granted');
    });
    void isGoogleCalendarConnected().then(setGoogleConnected);
    void supabase
      .from('availability_blocks')
      .select('synced_at')
      .eq('user_id', userId)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.synced_at) setLastSynced(new Date(data.synced_at));
      });
  }, [userId]);

  const handleSync = async (): Promise<void> => {
    setSyncing(true);
    try {
      await syncAvailability();
      setLastSynced(new Date());
      onSynced();
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGoogle = async (): Promise<void> => {
    setConnectingGoogle(true);
    try {
      const ok = await connectGoogleCalendar();
      if (ok) {
        setGoogleConnected(true);
        await handleSync();
      }
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = (): void => {
    Alert.alert(
      'Disconnect Google Calendar?',
      'Your Google Calendar busy times will no longer be used for scheduling.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async (): Promise<void> => {
            await disconnectGoogleCalendar();
            setGoogleConnected(false);
          },
        },
      ],
    );
  };

  const formatSynced = (d: Date): string => {
    const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  };

  return (
    <View style={styles.panel}>
      {/* Apple Calendar */}
      <View style={styles.row}>
        <View style={styles.calIcon}>
          <CheckCircle
            size={18}
            color={appleGranted ? colors.status.open : colors.text.tertiary}
            strokeWidth={1.75}
          />
        </View>
        <View style={styles.calInfo}>
          <Text style={styles.calName}>Apple Calendar</Text>
          <Text style={styles.calStatus}>
            {appleGranted
              ? lastSynced
                ? `Synced ${formatSynced(lastSynced)}`
                : 'Connected'
              : 'Not connected'}
          </Text>
        </View>
        {appleGranted && (
          <Pressable
            style={styles.actionBtn}
            onPress={handleSync}
            disabled={syncing}
            hitSlop={8}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <RefreshCw
                size={16}
                color={colors.accent.primary}
                strokeWidth={1.75}
              />
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.divider} />

      {/* Google Calendar */}
      <View style={styles.row}>
        <View style={styles.calIcon}>
          {googleConnected ? (
            <CheckCircle
              size={18}
              color={colors.status.open}
              strokeWidth={1.75}
            />
          ) : (
            <Circle size={18} color={colors.text.tertiary} strokeWidth={1.75} />
          )}
        </View>
        <View style={styles.calInfo}>
          <Text style={styles.calName}>Google Calendar</Text>
          <Text style={styles.calStatus}>
            {googleConnected ? 'Connected' : 'Not connected'}
          </Text>
        </View>
        <Pressable
          style={styles.actionBtn}
          onPress={
            googleConnected ? handleDisconnectGoogle : handleConnectGoogle
          }
          disabled={connectingGoogle}
          hitSlop={8}
        >
          {connectingGoogle ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <Text
              style={[
                styles.actionText,
                googleConnected && styles.actionTextDestructive,
              ]}
            >
              {googleConnected ? 'Disconnect' : 'Connect'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginLeft: spacing.lg,
  },
  calIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calInfo: {
    flex: 1,
  },
  calName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  calStatus: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actionBtn: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent.primary,
  },
  actionTextDestructive: {
    color: colors.status.error,
  },
});
