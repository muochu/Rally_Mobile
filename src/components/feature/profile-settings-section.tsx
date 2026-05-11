import { ChevronRight } from 'lucide-react-native';
import type { ReactElement } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type Props = {
  notifGranted: boolean;
  onNotifToggle: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export function ProfileSettingsSection({
  notifGranted,
  onNotifToggle,
  onSignOut,
  onDeleteAccount,
}: Props): ReactElement {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.rowGroup}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Push notifications</Text>
            <Switch
              value={notifGranted}
              onValueChange={onNotifToggle}
              trackColor={{
                false: colors.border.secondary,
                true: colors.accent.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        {!notifGranted && (
          <Text style={styles.notifHint}>
            Enable in Settings to receive match requests and reminders.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.rowGroup}>
          <Pressable
            style={styles.row}
            onPress={onSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.rowLabel}>Sign out</Text>
            <ChevronRight
              size={16}
              color={colors.text.tertiary}
              strokeWidth={1.75}
            />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.row}
            onPress={onDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.rowGroup}>
          <Pressable
            style={styles.row}
            onPress={(): void => {
              void Linking.openURL('https://rallysport.app/privacy');
            }}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
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
            onPress={(): void => {
              void Linking.openURL('https://rallysport.app/terms');
            }}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
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
    </>
  );
}

const styles = StyleSheet.create({
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
  notifHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
