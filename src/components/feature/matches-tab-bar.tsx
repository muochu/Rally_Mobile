import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Tab = 'upcoming' | 'pending' | 'past';

const TAB_LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  pending: 'Pending',
  past: 'Past',
};

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function MatchesTabBar({ activeTab, onTabChange }: Props): ReactElement {
  return (
    <View style={styles.tabRow}>
      {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
        <Pressable
          key={tab}
          onPress={(): void => onTabChange(tab)}
          style={styles.tabBtn}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab }}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab && styles.tabLabelActive,
            ]}
          >
            {TAB_LABELS[tab]}
          </Text>
          {activeTab === tab && <View style={styles.tabUnderline} />}
        </Pressable>
      ))}
    </View>
  );
}

export type { Tab };

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tabBtn: {
    marginRight: spacing.xxl,
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  tabLabelActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent.primary,
  },
});
