import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
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
  staggerIndex?: number;
}

const formatDistance = (km: number | null): string => {
  if (km === null) return '';
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
};

export function PlayerCard({
  player,
  onPress,
  staggerIndex = 0,
}: PlayerCardProps): ReactElement {
  const dist = formatDistance(player.distance_km);
  const meta = [
    player.utr_rating != null ? `UTR ${player.utr_rating.toFixed(1)}` : null,
    dist || player.city,
  ]
    .filter(Boolean)
    .join(' · ');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const delay = staggerIndex * 60;
    opacity.value = withDelay(delay, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 20, stiffness: 280 }),
    );
  }, [staggerIndex, opacity, translateY]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={enterStyle}>
      <PressableScale
        style={styles.row}
        onPress={() => onPress(player)}
        haptic="light"
        scale={0.98}
        accessibilityRole="button"
        accessibilityLabel={`View ${player.full_name}'s profile`}
      >
        <Avatar
          name={player.full_name}
          imageUrl={player.avatar_url}
          size={44}
        />

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
          <Text style={styles.overlapLabel}>days free</Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    gap: spacing.md,
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
