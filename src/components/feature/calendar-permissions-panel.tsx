import * as Calendar from 'expo-calendar';
import { CheckCircle, RefreshCw } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { syncAvailability } from '@/hooks/use-availability-sync';
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
  const [granted, setGranted] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Calendar.getCalendarPermissionsAsync().then(({ status }) => {
      setGranted(status === 'granted');
    });

    supabase
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
      <View style={styles.row}>
        <View style={styles.calIcon}>
          <CheckCircle
            size={18}
            color={granted ? colors.status.open : colors.text.tertiary}
            strokeWidth={1.75}
          />
        </View>
        <View style={styles.calInfo}>
          <Text style={styles.calName}>Apple Calendar</Text>
          <Text style={styles.calStatus}>
            {granted
              ? lastSynced
                ? `Synced ${formatSynced(lastSynced)}`
                : 'Connected'
              : 'Not connected'}
          </Text>
        </View>
        {granted && (
          <Pressable
            style={styles.syncBtn}
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
  syncBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
