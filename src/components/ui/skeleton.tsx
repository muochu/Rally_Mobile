import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { radii } from '@/theme/spacing';

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({
  width = '100%',
  height,
  borderRadius = radii.md,
  style,
}: SkeletonProps): ReactElement {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as number, height, borderRadius },
        animStyle,
        style,
      ]}
    />
  );
}

export function SkeletonPlayerCard(): ReactElement {
  return (
    <View style={styles.playerCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.playerCardText}>
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.playerCardRight}>
        <Skeleton width={24} height={16} />
        <Skeleton width={40} height={11} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function SkeletonFreeWindowCard(): ReactElement {
  return (
    <View style={styles.windowCard}>
      <Skeleton width={40} height={16} />
      <Skeleton width={50} height={12} style={{ marginTop: 4 }} />
      <Skeleton
        width={60}
        height={22}
        borderRadius={radii.full}
        style={{ marginTop: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border.primary,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  playerCardText: {
    flex: 1,
    gap: 0,
  },
  playerCardRight: {
    alignItems: 'flex-end',
  },
  windowCard: {
    width: 120,
    borderRadius: radii.lg,
    padding: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.elevated,
  },
});
