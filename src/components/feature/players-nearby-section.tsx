import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NearbyPlayer } from '@/components/feature/player-card';
import { PlayerCard } from '@/components/feature/player-card';
import { SkeletonPlayerCard } from '@/components/ui/skeleton';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

export type SkillFilter = 'all' | 'similar';

type Props = {
  filteredPlayers: NearbyPlayer[];
  playersLoading: boolean;
  skillFilter: SkillFilter;
  onFilterChange: (f: SkillFilter) => void;
  onPlayerPress: (player: NearbyPlayer) => void;
};

export function PlayersNearbySection({
  filteredPlayers,
  playersLoading,
  skillFilter,
  onFilterChange,
  onPlayerPress,
}: Props): ReactElement {
  return (
    <>
      <View style={styles.filterRow}>
        {(['all', 'similar'] as SkillFilter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.chip, skillFilter === f && styles.chipActive]}
            onPress={(): void => {
              haptics.light();
              onFilterChange(f);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              f === 'all' ? 'All skill levels' : 'Similar UTR'
            }
            accessibilityState={{ selected: skillFilter === f }}
          >
            <Text
              style={[
                styles.chipText,
                skillFilter === f && styles.chipTextActive,
              ]}
            >
              {f === 'all' ? 'All levels' : 'Similar UTR'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players nearby</Text>
        {playersLoading ? (
          <View>
            {[0, 1, 2].map((i) => (
              <View key={i}>
                {i > 0 && <View style={styles.divider} />}
                <SkeletonPlayerCard />
              </View>
            ))}
          </View>
        ) : filteredPlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No players nearby yet</Text>
            <Text style={styles.emptyBody}>
              Invite a friend to Rally or check back as more players join.
            </Text>
          </View>
        ) : (
          <View>
            {filteredPlayers.map((player, i) => (
              <View key={player.id}>
                {i > 0 && <View style={styles.divider} />}
                <PlayerCard
                  player={player}
                  onPress={onPlayerPress}
                  staggerIndex={i}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  chipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
