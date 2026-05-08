import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export interface NearbyPlayer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  utr_rating: number | null;
  city: string | null;
  home_court_name: string | null;
  distance_km: number | null;
  overlap_count: number;
}

interface PlayerCardProps {
  player: NearbyPlayer;
  onPress: (player: NearbyPlayer) => void;
}

const initials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDistance = (km: number | null): string => {
  if (km === null) return '';
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
};

export function PlayerCard({ player, onPress }: PlayerCardProps): ReactElement {
  const dist = formatDistance(player.distance_km);
  const meta = [
    player.utr_rating != null ? `UTR ${player.utr_rating.toFixed(1)}` : null,
    dist || player.city,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(player)}
      accessibilityRole="button"
      accessibilityLabel={`View ${player.full_name}'s profile`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(player.full_name)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {player.full_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      <View style={styles.overlap}>
        <Text style={styles.overlapCount}>{player.overlap_count}</Text>
        <Text style={styles.overlapLabel}>windows</Text>
      </View>
    </Pressable>
  );
}

const AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  meta: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  overlap: {
    alignItems: 'center',
  },
  overlapCount: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  overlapLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 1,
  },
});
